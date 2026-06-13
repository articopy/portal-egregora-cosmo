import { NextResponse } from "next/server";
import { createCustomer, createSubscription } from "@/lib/services/asaas";

export async function POST() {
  try {
    const testData = {
      nome: "Condômino Teste Asaas Sandbox",
      email: "teste-asaas@cosmoalmatv.com.br",
      cnpj_cpf: "123.456.789-10"
    };

    // 1. Create client in Asaas
    let customerId: string;
    try {
      customerId = await createCustomer(
        testData.nome,
        testData.email,
        testData.cnpj_cpf
      );
    } catch (e: any) {
      console.error("[Test Asaas] Error creating customer:", e);
      return NextResponse.json({
        success: false,
        error: `Erro ao cadastrar cliente no Asaas: ${e.message}`
      }, { status: 500 });
    }

    // 2. Create subscription in Asaas
    let subscriptionId: string;
    try {
      subscriptionId = await createSubscription(customerId, 100.0);
    } catch (e: any) {
      console.error("[Test Asaas] Error creating subscription:", e);
      return NextResponse.json({
        success: false,
        error: `Erro ao criar assinatura no Asaas: ${e.message}`
      }, { status: 500 });
    }

    const isMock = !process.env.ASAAS_API_KEY;

    return NextResponse.json({
      success: true,
      mode: isMock ? "Simulação (Chave de API ausente)" : "Asaas Sandbox",
      customer_id: customerId,
      subscription_id: subscriptionId,
      message: "Integração Asaas testada com sucesso! Cliente e Assinatura criados."
    });
  } catch (err: any) {
    console.error("[Test Asaas] Endpoint error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Erro desconhecido ao testar Asaas."
    }, { status: 500 });
  }
}
