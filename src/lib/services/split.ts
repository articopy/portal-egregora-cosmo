import { supabase } from "../supabase";

export async function runMonthlyFinancialSplit(
  mesReferencia: string,
  receitaBrutaAdsense: number
): Promise<any> {
  const retencaoAdm30 = receitaBrutaAdsense * 0.30;
  const fundoPartilha70 = receitaBrutaAdsense * 0.70;

  // Filter condominos by ATIVO_ADIMPLENTE
  const { data: eligibleCondominos, error: fetchError } = await supabase
    .from("condominos")
    .select("*")
    .eq("status", "ATIVO_ADIMPLENTE");

  if (fetchError || !eligibleCondominos) {
    throw new Error(`Failed to fetch eligible condominos for split: ${fetchError?.message}`);
  }

  const countEligible = eligibleCondominos.length;
  const valorPorCondomino = countEligible > 0 ? fundoPartilha70 / countEligible : 0.0;

  // Save closing to Supabase
  const { data: fechamento, error: insertError } = await supabase
    .from("fechamentos_financeiros")
    .insert({
      mes_referencia: mesReferencia,
      receita_bruta_adsense: receitaBrutaAdsense,
      retencao_adm_30: retencaoAdm30,
      fundo_partilha_70: fundoPartilha70,
      valor_por_condomino: valorPorCondomino,
      qtd_condominos_ativos: countEligible,
    })
    .select()
    .single();

  if (insertError || !fechamento) {
    throw new Error(`Failed to save fechamento financeiro: ${insertError?.message}`);
  }

  return {
    id: fechamento.id,
    mes_referencia: fechamento.mes_referencia,
    receita_bruta_adsense: fechamento.receita_bruta_adsense,
    retencao_adm_30: fechamento.retencao_adm_30,
    fundo_partilha_70: fechamento.fundo_partilha_70,
    valor_por_condomino: fechamento.valor_por_condomino,
    qtd_condominos_ativos: fechamento.qtd_condominos_ativos,
    data_fechamento: fechamento.data_fechamento,
    eligible_list: eligibleCondominos.map((c) => c.nome_comercial),
  };
}
