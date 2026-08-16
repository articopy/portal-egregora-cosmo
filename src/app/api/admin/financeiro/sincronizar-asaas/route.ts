import { NextResponse } from "next/server";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";
import { syncAsaasTransactionsHistory } from "@/lib/services/asaas";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem sincronizar extrato Asaas." }, { status: 403 });
    }

    const result = await syncAsaasTransactionsHistory();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na rota sincronizar-asaas:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
