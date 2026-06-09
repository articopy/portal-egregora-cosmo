import { NextResponse } from "next/server";
import { runMonthlyFinancialSplit } from "@/lib/services/split";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mesReferencia = body.mes_referencia;
    const receitaBrutaAdsense = body.receita_bruta_adsense;

    if (!mesReferencia || receitaBrutaAdsense === undefined || receitaBrutaAdsense === null) {
      return NextResponse.json(
        { detail: "Mês de referência e receita bruta do AdSense são requeridos." },
        { status: 400 }
      );
    }

    const result = await runMonthlyFinancialSplit(mesReferencia, Number(receitaBrutaAdsense));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Closing execution error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
