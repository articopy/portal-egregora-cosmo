import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isUserAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  // Valida se o usuário é administrador
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Acesso não autorizado. Sessão inválida ou expirada.' }, { status: 401 });
  }

  const isAdmin = isUserAdmin(user);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
  }

  return NextResponse.json({
    hasDescriptKey: !!process.env.DESCRIPT_API_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
}
