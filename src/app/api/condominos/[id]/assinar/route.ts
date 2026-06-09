import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCustomer, createSubscription } from "@/lib/services/asaas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the condomino
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !condomino) {
      return NextResponse.json({ detail: "Condômino não encontrado." }, { status: 404 });
    }

    if (condomino.status !== "AGUARDANDO_ASSINATURA") {
      return NextResponse.json(
        { detail: `Contrato não pode ser assinado no status atual: ${condomino.status}` },
        { status: 400 }
      );
    }

    try {
      // 1. Create Asaas customer
      const asaasCustomerId = await createCustomer(
        condomino.nome_completo,
        condomino.email,
        condomino.cnpj_cpf
      );

      // 2. Create monthly subscription of R$ 100
      await createSubscription(asaasCustomerId, 100.0);

      // 3. Update condomino in Supabase
      const { data: updatedCondomino, error: updateError } = await supabase
        .from("condominos")
        .update({
          asaas_id: asaasCustomerId,
          status: "ATIVO_PENDENTE_PAGAMENTO",
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return NextResponse.json(updatedCondomino);
    } catch (e: any) {
      console.error("Asaas integration error:", e);
      return NextResponse.json(
        { detail: `Erro na integração com o Asaas: ${e.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
