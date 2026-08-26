import { NextResponse } from "next/server";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";
import { cleanupDuplicateTransactions } from "@/lib/services/asaas";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem executar auditoria de duplicidades." }, { status: 403 });
    }

    const result = await cleanupDuplicateTransactions();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na rota deduplicar:", err);
    return NextResponse.json({ detail: err.message || "Erro ao executar auditoria de duplicidades." }, { status: 500 });
  }
}
