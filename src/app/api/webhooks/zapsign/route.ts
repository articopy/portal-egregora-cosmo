import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCustomer, createSubscription } from "@/lib/services/asaas";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // ZapSign webhook event
    const event = payload.event; // e.g., "doc_signed"
    const docToken = payload.token; // Unique token/id of the document in ZapSign

    console.log(`[ZapSign Webhook] Received event "${event}" for document token "${docToken}"`);

    if (!docToken) {
      return NextResponse.json({ detail: "Token do documento não informado no payload." }, { status: 400 });
    }

    // Process only when the document is fully signed
    if (event !== "doc_signed") {
      return NextResponse.json({
        status: "ignored",
        message: `Evento "${event}" não requer ativação. Apenas "doc_signed" é processado.`
      });
    }

    // Find the condomino with this zapsign_doc_id
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("zapsign_doc_id", docToken)
      .maybeSingle();

    if (error || !condomino) {
      console.error(`[ZapSign Webhook] Condomino not found or DB error for token ${docToken}:`, error);
      return NextResponse.json(
        { detail: "Condômino não encontrado para o token do ZapSign informado." },
        { status: 404 }
      );
    }

    // If the condomino status is already updated, ignore
    if (condomino.status !== "AGUARDANDO_ASSINATURA") {
      return NextResponse.json({
        status: "ignored",
        message: `Condômino já está no status: ${condomino.status}`
      });
    }

    try {
      console.log(`[ZapSign Webhook] Initiating Asaas setup for ${condomino.nome_completo}...`);

      // 1. Create Asaas customer
      const asaasCustomerId = await createCustomer(
        condomino.nome_completo,
        condomino.email,
        condomino.cnpj_cpf
      );

      // 2. Create monthly subscription of R$ 100
      await createSubscription(asaasCustomerId, 100.0);

      // 3. Update condomino status to ATIVO_PENDENTE_PAGAMENTO
      const { error: updateError } = await supabase
        .from("condominos")
        .update({
          asaas_id: asaasCustomerId,
          status: "ATIVO_PENDENTE_PAGAMENTO",
        })
        .eq("id", condomino.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log(`[ZapSign Webhook] Successfully activated ${condomino.nome_comercial} to ATIVO_PENDENTE_PAGAMENTO`);

      return NextResponse.json({
        status: "success",
        message: `Assinatura criada no Asaas para ${condomino.nome_comercial} com sucesso.`
      });
    } catch (asaasErr: any) {
      console.error("[ZapSign Webhook] Error during Asaas provisioning:", asaasErr);
      return NextResponse.json(
        { detail: `Erro no processamento pós-assinatura (Asaas): ${asaasErr.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[ZapSign Webhook] Fatal crash:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
