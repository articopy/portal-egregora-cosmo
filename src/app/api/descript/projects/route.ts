import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isUserAdmin } from '@/lib/auth';

export async function GET(request: Request) {
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
    const response = await fetch('https://descriptapi.com/v1/projects', {
      headers: {
        'Authorization': `Bearer ${descriptKey}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        error: 'Erro ao buscar projetos do Descript no servidor externo.',
        details: data
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro de comunicação com a API do Descript.',
      details: error.message
    }, { status: 500 });
  }
}
