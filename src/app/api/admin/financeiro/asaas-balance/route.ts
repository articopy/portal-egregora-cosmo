import { NextResponse } from "next/server";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";
import { getAsaasBalance } from "@/lib/services/asaas";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem consultar o saldo Asaas." }, { status: 403 });
    }

    // 1. Fetch real bank balance from Asaas API
    const asaasBalanceData = await getAsaasBalance();

    // 2. Fetch all-time system transactions to calculate cumulative reconciled balance
    const { data: allPagas, error: txError } = await supabase
      .from("transacoes_financeiras")
      .select("tipo, valor, status")
      .eq("status", "PAGO");

    let totalEntradasAcumulado = 0;
    let totalSaidasAcumulado = 0;

    if (allPagas && !txError) {
      for (const t of allPagas) {
        if (t.tipo === "ENTRADA") {
          totalEntradasAcumulado += Number(t.valor) || 0;
        } else if (t.tipo === "SAIDA") {
          totalSaidasAcumulado += Number(t.valor) || 0;
        }
      }
    }

    const saldoSistemaAcumulado = totalEntradasAcumulado - totalSaidasAcumulado;
    const saldoAsaasReal = asaasBalanceData.balance;
    const diferencaConciliacao = Number((saldoAsaasReal - saldoSistemaAcumulado).toFixed(2));

    return NextResponse.json({
      success: true,
      saldoAsaasReal,
      saldoAsaasBloqueado: asaasBalanceData.blockedAmount || 0,
      saldoAsaasTotal: asaasBalanceData.totalAmount || saldoAsaasReal,
      saldoSistemaAcumulado,
      totalEntradasAcumulado,
      totalSaidasAcumulado,
      diferencaConciliacao,
      isConciliado: Math.abs(diferencaConciliacao) < 0.01,
      isMock: asaasBalanceData.isMock,
    });
  } catch (err: any) {
    console.error("Erro na rota asaas-balance:", err);
    return NextResponse.json({ detail: err.message || "Erro ao consultar saldo Asaas." }, { status: 500 });
  }
}
