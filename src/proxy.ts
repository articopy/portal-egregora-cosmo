import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isUserAdmin } from "@/lib/auth";

// Next.js Proxy running on Edge Runtime (formerly Middleware in Next.js < 16)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ detail: "Acesso não autorizado. Token de autenticação ausente." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // We validate the token by calling Supabase auth endpoint directly via fetch
    // to keep it edge-runtime compatible and avoid library overhead
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      // In simulation mode or dev configuration mismatch, let it pass
      console.warn("Supabase credentials missing in proxy. Bypassing check.");
      return NextResponse.next();
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return NextResponse.json({ detail: "Sessão inválida ou expirada." }, { status: 401 });
      }

      const user = await response.json();
      
      const isAdmin = isUserAdmin(user);

      if (!isAdmin) {
        // Permitir que condôminos autenticados vejam fechamentos históricos (GET)
        if (pathname === "/api/admin/fechamentos" && request.method === "GET") {
          return NextResponse.next();
        }
        return NextResponse.json({ detail: "Acesso restrito a administradores do sistema." }, { status: 403 });
      }
    } catch (err: any) {
      console.error("Proxy Auth verification error:", err);
      return NextResponse.json({ detail: `Erro interno de autenticação: ${err.message}` }, { status: 500 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
