import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isUserAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  // Valida autenticação e autorização contra o Supabase (somente admin)
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Acesso não autorizado. Sessão inválida ou expirada.' }, { status: 401 });
  }

  const isAdmin = isUserAdmin(user);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
  }

  // Obtém o token de API do header customizado ou do arquivo .env.local
  const descriptKey = request.headers.get('x-descript-api-key') || process.env.DESCRIPT_API_KEY;

  if (!descriptKey) {
    return NextResponse.json({ error: 'Chave de API do Descript não fornecida.' }, { status: 400 });
  }

  try {
    const { projectId, format = 'txt', includeSpeakerLabels = 'changes' } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID é obrigatório.' }, { status: 400 });
    }

    const response = await fetch('https://descriptapi.com/v1/export/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${descriptKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id: projectId,
        format: format,
        include_speaker_labels: includeSpeakerLabels
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json({
        error: 'Erro ao exportar transcrito do Descript no servidor externo.',
        details: text
      }, { status: response.status });
    }

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro de comunicação com a API do Descript.',
      details: error.message
    }, { status: 500 });
  }
}
