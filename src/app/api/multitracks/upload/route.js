import { NextResponse } from 'next/server';
import { uploadToMinio, deleteFromMinio } from '../../../services/minio';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const songId = formData.get('songId');
    const instrument = formData.get('instrument') || 'Geral';
    const file = formData.get('file');

    if (!songId || !file) {
      return NextResponse.json({ error: 'Parâmetros songId e file são obrigatórios' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return NextResponse.json({ error: 'Formato inválido. Apenas arquivos .mp3 são permitidos para multitracks.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${songId}/${Date.now()}_${sanitizedFileName}`;

    const uploaded = await uploadToMinio(objectKey, buffer, 'audio/mpeg');

    return NextResponse.json({
      success: true,
      track: {
        id: objectKey.replace(/[/.]/g, '_'),
        key: objectKey,
        name: file.name.replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, ''),
        fileName: file.name,
        instrument: instrument,
        size: file.size,
        url: uploaded.url,
        createdAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Multitrack upload error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao realizar upload no MinIO' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Parâmetro key é obrigatório' }, { status: 400 });
    }

    await deleteFromMinio(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Multitrack delete error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao deletar faixa do MinIO' }, { status: 500 });
  }
}
