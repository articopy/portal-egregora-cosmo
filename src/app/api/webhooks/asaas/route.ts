import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendCreatorWelcomeAndTrainingNotification } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event = payload.event;
    const payment = payload.payment || {};
    const customerId = payment.customer;

    if (!customerId) {
      return NextResponse.json(
        { detail: "Identificador do cliente não encontrado no pagamento." },
        { status: 400 }
      );
    }

    // Search condomino by asaas_id
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("asaas_id", customerId)
      .maybeSingle();

    if (error || !condomino) {
      return NextResponse.json(
        { detail: "Condômino não encontrado para o cliente Asaas especificado." },
        { status: 404 }
      );
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const shouldSendWelcome = !condomino.boas_vindas_enviada;
      const updateData: any = { status: "ATIVO_ADIMPLENTE" };
      if (shouldSendWelcome) {
        updateData.boas_vindas_enviada = true;
        updateData.boas_vindas_enviada_em = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("condominos")
        .update(updateData)
        .eq("id", condomino.id);

      if (updateError) throw new Error(updateError.message);

      // Disparar e-mail de boas-vindas com treinamentos obrigatórios SOMENTE 1 VEZ na adesão
      if (shouldSendWelcome) {
        (async () => {
          try {
            const { data: mandatoryModules } = await supabase
              .from("treinamento_modulos")
              .select("*")
              .eq("ativo", true)
              .eq("obrigatorio", true)
              .order("ordem", { ascending: true });

            await sendCreatorWelcomeAndTrainingNotification({
              creator: condomino,
              mandatoryModules: mandatoryModules || []
            });
            console.log(`[Asaas Webhook] E-mail de boas-vindas e treinamento enviado para: ${condomino.nome_comercial} (${condomino.email})`);
          } catch (mailErr) {
            console.error("[Asaas Webhook] Erro ao enviar e-mail de boas-vindas do treinamento:", mailErr);
          }
        })();
      }

      // Record transaction in cashflow
      const paymentId = payment.id || "";
      const valorPago = payment.value || 100.0;
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const mes_referencia = `${year}-${month}`;

      try {
        let creatorDisplayName = "";
        if (condomino.nome_comercial && condomino.nome_completo && condomino.nome_comercial !== condomino.nome_completo) {
          creatorDisplayName = `${condomino.nome_comercial} (${condomino.nome_completo})`;
        } else {
          creatorDisplayName = condomino.nome_comercial || condomino.nome_completo || "Criador";
        }

        const { data: existingTx } = await supabase
          .from("transacoes_financeiras")
          .select("id")
          .or(`asaas_id.eq.${paymentId},descricao.ilike.%${paymentId}%`)
          .limit(1);

        if ((!existingTx || existingTx.length === 0) && paymentId) {
          await supabase
            .from("transacoes_financeiras")
            .insert({
              tipo: "ENTRADA",
              descricao: `Cota Condominial - ${creatorDisplayName} (Ref Asaas: ${paymentId})`,
              valor: valorPago,
              categoria: "Cota Condominial",
              status: "PENDENTE_APROVACAO",
              origem: "ASAAS",
              asaas_id: paymentId,
              mes_referencia,
              data_transacao: today.toISOString().split("T")[0]
            });
        }
      } catch (txErr) {
        console.error("Failed to record condomino payment in transacoes_financeiras:", txErr);
      }

      return NextResponse.json({
        status: "success",
        message: `Condômino ${condomino.nome_comercial} ativado como adimplente e transação enviada para aprovação.`,
      });
    } else if (event === "PAYMENT_OVERDUE") {
      // Cláusula 11ª: Suspensão automática por inadimplência
      const { error: updateError } = await supabase
        .from("condominos")
        .update({ status: "SUSPENSO_INADIMPLENCIA" })
        .eq("id", condomino.id);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        status: "success",
        message: `Condômino ${condomino.nome_comercial} suspenso por inadimplência.`,
      });
    }

    return NextResponse.json({
      status: "ignored",
      message: `Evento ${event} não requer ação.`,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
