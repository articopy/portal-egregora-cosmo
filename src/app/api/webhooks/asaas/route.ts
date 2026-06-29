import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      const { error: updateError } = await supabase
        .from("condominos")
        .update({ status: "ATIVO_ADIMPLENTE" })
        .eq("id", condomino.id);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        status: "success",
        message: `Condômino ${condomino.nome_comercial} ativado como adimplente.`,
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
