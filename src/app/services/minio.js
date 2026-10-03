import crypto from 'crypto';

/**
 * Native lightweight AWS S3 / MinIO V4 signature implementation
 * Avoids extra bulky dependencies and works smoothly in Next.js Server Runtimes.
 */
function getMinioConfig() {
  const endpoint = process.env.MINIO_ENDPOINT || 'minio';
  const port = parseInt(process.env.MINIO_PORT || '9000', 10);
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'admin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'secretpassword';
  const bucket = process.env.MINIO_BUCKET || 'multitracks';
  const region = 'us-east-1';

  const isStandardPort = (useSSL && port === 443) || (!useSSL && port === 80);
  const baseUrl = `${useSSL ? 'https' : 'http'}://${endpoint}${isStandardPort ? '' : `:${port}`}`;
  return { endpoint, port, useSSL, accessKey, secretKey, bucket, region, baseUrl, isStandardPort };
}

function hmacSHA256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmacSHA256(`AWS4${key}`, dateStamp);
  const kRegion = hmacSHA256(kDate, regionName);
  const kService = hmacSHA256(kRegion, serviceName);
  const kSigning = hmacSHA256(kService, 'aws4_request');
  return kSigning;
}

export async function minioRequest({ method = 'GET', path = '', query = {}, body = null, headers = {} }) {
  const config = getMinioConfig();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const hostHeader = config.isStandardPort ? config.endpoint : `${config.endpoint}:${config.port}`;

  const payloadHash = body ? sha256(body) : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const reqHeaders = {
    ...headers,
    host: hostHeader,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };

  // Canonical Query String
  const sortedQueryParams = Object.keys(query)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');

  // Canonical Headers
  const sortedHeaderKeys = Object.keys(reqHeaders).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${reqHeaders[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    encodeURI(urlPath),
    sortedQueryParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretKey, dateStamp, config.region, 's3');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader = `${algorithm} Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const targetUrl = `${config.baseUrl}${urlPath}${sortedQueryParams ? `?${sortedQueryParams}` : ''}`;

  return fetch(targetUrl, {
    method: method.toUpperCase(),
    headers: {
      ...reqHeaders,
      Authorization: authorizationHeader,
    },
    body: body,
  });
}

/**
 * Ensures bucket exists on MinIO
 */
export async function ensureBucket() {
  const config = getMinioConfig();
  const res = await minioRequest({
    method: 'HEAD',
    path: `/${config.bucket}`,
  });

  if (res.status === 404) {
    // Create bucket
    const createRes = await minioRequest({
      method: 'PUT',
      path: `/${config.bucket}`,
    });
    return createRes.ok;
  }
  return res.ok;
}

/**
 * Upload object to MinIO
 */
export async function uploadToMinio(objectKey, buffer, contentType = 'audio/mpeg') {
  const config = getMinioConfig();
  await ensureBucket();

  const res = await minioRequest({
    method: 'PUT',
    path: `/${config.bucket}/${objectKey}`,
    headers: {
      'content-type': contentType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`MinIO Upload Error [${res.status}]: ${errorText}`);
  }

  return {
    bucket: config.bucket,
    key: objectKey,
    url: `/api/multitracks/${encodeURIComponent(objectKey)}`,
  };
}

/**
 * Delete object from MinIO
 */
export async function deleteFromMinio(objectKey) {
  const config = getMinioConfig();
  const res = await minioRequest({
    method: 'DELETE',
    path: `/${config.bucket}/${objectKey}`,
  });
  return res.ok;
}

/**
 * Get stream / response of object from MinIO
 */
export async function getFromMinio(objectKey, extraHeaders = {}) {
  const config = getMinioConfig();
  return minioRequest({
    method: 'GET',
    path: `/${config.bucket}/${objectKey}`,
    headers: extraHeaders,
  });
}
