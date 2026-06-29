import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCustomer, createSubscription } from "@/lib/services/asaas";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Assinafy webhook event
    const event = payload.event; // e.g., "document_ready"
    const docObj = payload.object || {};
    const docToken = docObj.id; // Unique ID of the document in Assinafy

    console.log(`[Assinafy Webhook] Received event "${event}" for document ID "${docToken}"`);

    if (!docToken) {
      return NextResponse.json({ detail: "ID do documento não informado no payload." }, { status: 400 });
    }

    // Process only when the document is fully signed and ready
    if (event !== "document_ready") {
      return NextResponse.json({
        status: "ignored",
        message: `Evento "${event}" não requer ativação. Apenas "document_ready" é processado.`
      });
    }

    // Find the condomino with this doc ID mapped to zapsign_doc_id
    let { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("zapsign_doc_id", docToken)
      .maybeSingle();

    // Fallback: If not found, try searching by the signer's full name from the webhook payload
    if (!condomino) {
      console.log(`[Assinafy Webhook] Document ID ${docToken} not found in DB. Trying fallback search...`);
      const signers = docObj.assignment?.signers || [];
      for (const signer of signers) {
        if (signer.full_name) {
          console.log(`[Assinafy Webhook] Searching condomino by full name: ${signer.full_name}`);
          const { data: matchedByName } = await supabase
            .from("condominos")
            .select("*")
            .ilike("nome_completo", signer.full_name)
            .maybeSingle();
          
          if (matchedByName) {
            condomino = matchedByName;
            console.log(`[Assinafy Webhook] Matched condomino by name: ${condomino.nome_completo}. Associating new document ID: ${docToken}`);
            // Update the condomino's document ID in Supabase to keep them linked
            await supabase
              .from("condominos")
              .update({ zapsign_doc_id: docToken })
              .eq("id", condomino.id);
            break;
          }
        }
      }
    }

    if (error || !condomino) {
      console.error(`[Assinafy Webhook] Condomino not found or DB error for token ${docToken}:`, error);
      return NextResponse.json(
        { detail: "Condômino não encontrado para o ID de documento do Assinafy informado." },
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
      console.log(`[Assinafy Webhook] Initiating Asaas setup for ${condomino.nome_completo}...`);

      // 1. Create Asaas customer
      const asaasCustomerId = await createCustomer(
        condomino.nome_completo,
        condomino.email,
        condomino.cnpj_cpf,
        condomino.telefone
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

      console.log(`[Assinafy Webhook] Successfully activated ${condomino.nome_comercial} to ATIVO_PENDENTE_PAGAMENTO`);

      return NextResponse.json({
        status: "success",
        message: `Assinatura criada no Asaas para ${condomino.nome_comercial} com sucesso.`
      });
    } catch (asaasErr: any) {
      console.error("[Assinafy Webhook] Error during Asaas provisioning:", asaasErr);
      return NextResponse.json(
        { detail: `Erro no processamento pós-assinatura (Asaas): ${asaasErr.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[Assinafy Webhook] Fatal crash:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
