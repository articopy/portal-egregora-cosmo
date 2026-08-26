import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const originalName = file.name || 'material.pdf';
    const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const fileName = `${Date.now()}_${sanitizedBase}.${extension}`;
    const filePath = `materiais/${fileName}`;

    // Detect type
    let tipo: 'pdf' | 'link' | 'drive' | 'canva' | 'outro' = 'outro';
    if (extension === 'pdf') tipo = 'pdf';
    else if (['zip', 'rar', '7z'].includes(extension)) tipo = 'outro';
    else if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) tipo = 'outro';

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure bucket exists in Supabase Storage or upload
    const BUCKET_NAME = 'treinamentos';

    try {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      });
    } catch (e) {
      // Bucket might already exist
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      console.warn('Erro ao subir no Supabase Storage, tentando criar URL alternativa:', uploadError);
      // If Supabase storage is not configured with service role, return an error or descriptive message
      return NextResponse.json({
        error: `Falha no Supabase Storage: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || '';

    return NextResponse.json({
      success: true,
      nome: originalName,
      url: publicUrl,
      tipo,
      size: file.size
    });
  } catch (err: any) {
    console.error('Erro na API de upload:', err);
    return NextResponse.json({ error: err.message || 'Erro interno de upload' }, { status: 500 });
  }
}
