import { NextResponse } from 'next/server';
import { getFromMinio } from '../../../services/minio';

export async function GET(request, context) {
  try {
    const params = await context.params;
    let objectKey = params.key;
    if (Array.isArray(objectKey)) {
      objectKey = objectKey.join('/');
    }
    objectKey = decodeURIComponent(objectKey);

    const range = request.headers.get('range');
    const extraHeaders = {};
    if (range) {
      extraHeaders['range'] = range;
    }

    const minioRes = await getFromMinio(objectKey, extraHeaders);

    if (minioRes.status === 404) {
      return new NextResponse('File not found', { status: 404 });
    }

    if (!minioRes.ok && minioRes.status !== 206) {
      return new NextResponse('Error fetching from MinIO', { status: minioRes.status });
    }

    const headers = new Headers();
    const contentType = minioRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = minioRes.headers.get('content-length');
    const contentRange = minioRes.headers.get('content-range');
    const acceptRanges = minioRes.headers.get('accept-ranges') || 'bytes';

    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', acceptRanges);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(minioRes.body, {
      status: minioRes.status,
      headers,
    });
  } catch (error) {
    console.error('Proxy MinIO route error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
