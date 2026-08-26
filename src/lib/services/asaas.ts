import { supabase } from "@/lib/supabase";

const ASAAS_API_KEY = (process.env.ASAAS_API_KEY || "").trim();
const ASAAS_API_URL = (process.env.ASAAS_API_URL || "https://sandbox.asaas.com/v3").trim();

function generateMockId(prefix: string): string {
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${randomStr}`;
}

export async function createCustomer(nome: string, email: string, cnpjCpf: string, phone?: string): Promise<string> {
  if (!ASAAS_API_KEY) {
    const mockId = generateMockId("cus");
    console.warn(`[Asaas Mock] Creating customer ${nome}. ID: ${mockId}`);
    return mockId;
  }

  const cleanCnpjCpf = cnpjCpf.replace(/\D/g, "");
  const cleanPhone = phone ? phone.replace(/\D/g, "") : undefined;

  const response = await fetch(`${ASAAS_API_URL}/customers`, {
    method: "POST",
    headers: {
      "access_token": ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: nome,
      email: email,
      cpfCnpj: cleanCnpjCpf,
      phone: cleanPhone,
      mobilePhone: cleanPhone,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error creating customer in Asaas: ${errorText}`);
    throw new Error(`Asaas Error: ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

export async function createSubscription(customerId: string, value: number = 100.0): Promise<string> {
  if (!ASAAS_API_KEY) {
    const mockId = generateMockId("sub");
    console.warn(`[Asaas Mock] Creating subscription of R$ ${value} for ${customerId}. ID: ${mockId}`);
    return mockId;
  }

  // Next due date logic: every day 10
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth(); // 0-indexed

  if (today.getDate() > 10) {
    // Next month day 10
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const nextDue = new Date(year, month, 10);
  const formattedDueDate = nextDue.toISOString().split("T")[0];

  const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
    method: "POST",
    headers: {
      "access_token": ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED", // Boleto + Pix
      value: value,
      nextDueDate: formattedDueDate,
      cycle: "MONTHLY",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error creating subscription in Asaas: ${errorText}`);
    throw new Error(`Asaas Error: ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

export async function getPendingPixQrCode(customerId: string): Promise<any> {
  if (!ASAAS_API_KEY) {
    // Return mock data for local development if API key is not configured
    return {
      success: true,
      encodedImage: "iVBORw0KGgoAAAANSUhEUgAAAcIAAAHCAQAAAABUY/ToAAADgUlEQVR4Xu2XQY4bSwxDe9f3v1GO1Ttn+EiVnQAfE+QvogXLdpeK4uMsSjYw1+sv14/rd+VPV8nvVsnv1v8in4t1q7ifrxfF60UR4cas7bhLbiWRx3H8NkjWeZKPu+ReUpKULwsRQuge5o0dd8nlpPdPVA9du3ifx1VyPynPb6UTD3ByS64mX3bi8ZXbrEqbxNOLu+RaUjce7x+84i75n69/TJ7FtbvD5pkgU1f/oJxVcimZLk+3/U32kpkYjUHCVZXcSwrjw+9wCtsH/hgKDvlNKLmPBDVsQm+s8Z1cET7c/k0ouZDUjgXhiR2JFBhMZyx0KrmV5GZlGuSxIUlUg7z5kkvJNIxTCaDrOCe+A51Xciv5uO2JiB0tNvc4qhm15FJSzktTMKbj/wxxLjNDRMmtpP2WUYfNt3tSFDD0ld+EkhtJxCS4DyLXLV/GwUJiSu4lZTpvB+Tbjl+obv8I/KGSS0lfLAFuaRLkTuGS7kktuZu8fPGXBkEwgqmYeXKiLrmWZPcdG3Yx9k9GT+yPf6lLLiQfLty4auH+GIwXSpvet2eo5E7yVpN9Ws7i7Zkg1UcllNxL0vMCES01UhitYyu5mMT3wivJ8NGYCJu9WS+5lZy+yedMhL7bT77gqmi6UkDJpSQ3nVt/JQcx04Ex44DmreRSUhLrTdo8moQ8o+kPlVxKSgiE27UIGdxF9VMdfUquJS3HildSPs5TP4hjS+4lx5EQVeqGPTQ9hkZ/ouRSEtOczZhDQZxkVVJ1KrmUFDP6RKj/BV26/Ag5T3DJraSIKzZ1CDCrxpzfEGEl95KUah6/bQkMY574kotJcdKAPuYAwBXANN0uuZWU53GfJ54MAQFhVCjOx5JrSaky2a49H3IMjX/moORi8tjVyDRkEiaMDg075j+dkgvJwLQuFfk4wxGxJfKeGSq5j3QlVbfsY1KwiUaOoIMnoeRC0nf760NJ3PxBSfW8sJXcSrr4sOJBwnWl/ZCI4T1DJfeRx6GG3mcmmIFBpqPWPb/xJTeSrMfaI7NPuX0AHch2RMm1pIS5X5p2BlFOwpQ3wSX3klQ89RhTDryU40gb9EdKriW5+GkengnRGKiCjoZccj+pR/qC9XBtdHi3S+4nx40N2nC6atwzKCXXkq+4DYsH004qfWcZ07PkVlIaHt55yZsiJRsYYsml5F+ukt+tkt+tf0L+BAFSHclfXFvoAAAAAElFTkSuQmCC",
      payload: "00020101021226800014br.gov.bcb.pix2558pix.asaas.com/qr/cobv/mocked-pix-payload-for-development-purposes-only-630460D9",
      dueDate: "2026-07-10",
      value: 100.0,
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/mock",
    };
  }

  try {
    const paymentsRes = await fetch(`${ASAAS_API_URL}/payments?customer=${customerId}&status=PENDING`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!paymentsRes.ok) {
      const errorText = await paymentsRes.text();
      console.error(`Error querying payments in Asaas: ${errorText}`);
      throw new Error(`Asaas Payments Query Error: ${errorText}`);
    }

    const paymentsData = await paymentsRes.json();
    const pendingPayment = paymentsData.data?.[0];

    if (!pendingPayment) {
      return { success: false, detail: "Nenhum pagamento pendente encontrado no Asaas." };
    }

    const qrRes = await fetch(`${ASAAS_API_URL}/payments/${pendingPayment.id}/pixQrCode`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!qrRes.ok) {
      const errorText = await qrRes.text();
      console.error(`Error fetching Pix QR Code from Asaas: ${errorText}`);
      throw new Error(`Asaas QR Code Error: ${errorText}`);
    }

    const qrData = await qrRes.json();
    return {
      success: true,
      encodedImage: qrData.encodedImage,
      payload: qrData.payload,
      dueDate: pendingPayment.dueDate,
      value: pendingPayment.value,
      status: pendingPayment.status,
      invoiceUrl: pendingPayment.invoiceUrl,
    };
  } catch (err: any) {
    console.error("Error in getPendingPixQrCode:", err);
    throw err;
  }
}

export async function checkPaymentStatus(customerId: string): Promise<boolean> {
  if (!ASAAS_API_KEY) {
    return false;
  }
  try {
    const response = await fetch(`${ASAAS_API_URL}/payments?customer=${customerId}`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      const payments = data.data || [];
      // Look for CONFIRMED or RECEIVED
      return payments.some((p: any) => p.status === "CONFIRMED" || p.status === "RECEIVED");
    }
  } catch (err) {
    console.error("Error checking payment status in Asaas:", err);
  }
  return false;
}

export async function getAsaasBalance(): Promise<{
  success: boolean;
  balance: number;
  totalAmount?: number;
  blockedAmount?: number;
  isMock: boolean;
}> {
  if (!ASAAS_API_KEY) {
    return {
      success: true,
      balance: 15420.50,
      totalAmount: 15420.50,
      blockedAmount: 0,
      isMock: true,
    };
  }

  try {
    const res = await fetch(`${ASAAS_API_URL}/finance/balance`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Error fetching Asaas balance: ${errorText}`);
      throw new Error(`Asaas Balance Error: ${errorText}`);
    }

    const data = await res.json();
    return {
      success: true,
      balance: Number(data.balance) || 0,
      totalAmount: Number(data.totalAmount ?? data.balance) || 0,
      blockedAmount: Number(data.blockedAmount) || 0,
      isMock: false,
    };
  } catch (err: any) {
    console.error("Error in getAsaasBalance:", err);
    throw err;
  }
}

export async function syncAsaasTransactionsHistory(mesFiltro?: string): Promise<{ success: boolean; importedCount: number; message: string }> {
  if (!ASAAS_API_KEY) {
    return { success: false, importedCount: 0, message: "Chave de API do Asaas (ASAAS_API_KEY) não configurada." };
  }

  let importedCount = 0;

  try {
    // 1. Mapear condôminos do Supabase para vincular pagamentos aos nomes oficiais
    const { data: conds } = await supabase.from("condominos").select("id, nome_comercial, nome_completo, email, asaas_id");
    const condominoByAsaasId = new Map<string, any>();
    const condominoByEmail = new Map<string, any>();

    (conds || []).forEach((c) => {
      if (c.asaas_id) condominoByAsaasId.set(c.asaas_id, c);
      if (c.email) condominoByEmail.set(c.email.toLowerCase(), c);
    });

    // 2. Buscar clientes no Asaas para mapeamento adicional de nomes caso necessário
    const customerNameMap = new Map<string, string>();
    try {
      const cusRes = await fetch(`${ASAAS_API_URL}/customers?limit=100`, {
        headers: { "access_token": ASAAS_API_KEY, "Content-Type": "application/json" }
      });
      if (cusRes.ok) {
        const cusData = await cusRes.json();
        (cusData.data || []).forEach((cus: any) => {
          customerNameMap.set(cus.id, cus.name || cus.email || "Criador");
        });
      }
    } catch (e) {}

    // 3. Buscar pagamentos/cobranças no Asaas (Fonte Oficial da Cota Condominial)
    const paymentsRes = await fetch(`${ASAAS_API_URL}/payments?limit=100`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json();
      const paymentsList = paymentsData.data || [];

      for (const item of paymentsList) {
        // Apenas transações confirmadas ou recebidas
        if (item.status === "RECEIVED" || item.status === "CONFIRMED") {
          const asaasId = item.id;
          const valor = Number(item.value) || 100;
          const dateStr = item.paymentDate || item.clientPaymentDate || item.dueDate || new Date().toISOString().split("T")[0];
          const transacaoData = new Date(dateStr);
          const year = transacaoData.getFullYear();
          const month = String(transacaoData.getMonth() + 1).padStart(2, "0");
          const mes_referencia = `${year}-${month}`;

          // Se um filtro de mês foi passado (ex: 2026-08), ignora transações de outros meses
          if (mesFiltro && mes_referencia !== mesFiltro) {
            continue;
          }

          // Resolver nome padronizado do criador e da playlist
          const condomino = condominoByAsaasId.get(item.customer) || (item.customerEmail ? condominoByEmail.get(item.customerEmail.toLowerCase()) : null);
          let creatorDisplayName = "";
          if (condomino) {
            if (condomino.nome_comercial && condomino.nome_completo && condomino.nome_comercial !== condomino.nome_completo) {
              creatorDisplayName = `${condomino.nome_comercial} (${condomino.nome_completo})`;
            } else {
              creatorDisplayName = condomino.nome_comercial || condomino.nome_completo || "Criador";
            }
          } else {
            creatorDisplayName = customerNameMap.get(item.customer) || "Criador";
          }

          const desc = `Cota Condominial - ${creatorDisplayName} (Ref Asaas: ${asaasId})`;

          // Verificação Anti-Duplicidade Rígida:
          // 1. Por ID de cobrança Asaas
          // 2. Por mês de referência + nome comercial ou nome completo
          let isDuplicate = false;

          // Checagem 1: por asaasId
          const { data: byId } = await supabase
            .from("transacoes_financeiras")
            .select("id, status")
            .or(`asaas_id.eq.${asaasId},descricao.ilike.%${asaasId}%`)
            .limit(1);

          if (byId && byId.length > 0) {
            isDuplicate = true;
          }

          // Checagem 2: por condomino no mesmo mês
          if (!isDuplicate && condomino) {
            const checks: string[] = [];
            if (condomino.nome_comercial) {
              checks.push(`descricao.ilike.%${condomino.nome_comercial}%`);
            }
            if (condomino.nome_completo) {
              checks.push(`descricao.ilike.%${condomino.nome_completo}%`);
            }
            if (checks.length > 0) {
              const { data: byName } = await supabase
                .from("transacoes_financeiras")
                .select("id")
                .eq("mes_referencia", mes_referencia)
                .eq("categoria", "Cota Condominial")
                .or(checks.join(","))
                .limit(1);

              if (byName && byName.length > 0) {
                isDuplicate = true;
              }
            }
          }

          if (!isDuplicate) {
            const txPayload: any = {
              tipo: "ENTRADA",
              descricao: desc,
              valor: valor,
              categoria: "Cota Condominial",
              status: "PENDENTE_APROVACAO",
              mes_referencia,
              data_transacao: dateStr,
              origem: "ASAAS",
              asaas_id: asaasId,
            };

            const { error: insErr } = await supabase.from("transacoes_financeiras").insert(txPayload);
            if (insErr) {
              delete txPayload.origem;
              delete txPayload.asaas_id;
              await supabase.from("transacoes_financeiras").insert(txPayload);
            }
            importedCount++;
          }
        }
      }
    }

    // 4. Buscar extrato de despesas reais / transferências Pix no Asaas
    const finRes = await fetch(`${ASAAS_API_URL}/financialTransactions?limit=100`, {
      method: "GET",
      headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (finRes.ok) {
      const finData = await finRes.json();
      const finList = finData.data || [];

      for (const item of finList) {
        const asaasId = item.id;
        const rawValue = Number(item.value) || 0;
        const itemDesc = (item.description || "").toLowerCase();

        // Ignora recebimentos de cobrança (já tratados no /payments)
        if (rawValue >= 0 || item.paymentId || itemDesc.includes("cobrança recebida") || itemDesc.includes("recebimento asaas")) {
          continue;
        }

        // Ignora tarifas e taxas bancárias automáticas de mensageria / boleto / pix
        if (itemDesc.includes("taxa do pix") || itemDesc.includes("taxa de mensageria") || itemDesc.includes("taxa de boleto") || itemDesc.includes("taxa bancária")) {
          continue;
        }

        const absValue = Math.abs(rawValue);
        if (absValue === 0) continue;

        const dateStr = item.date || new Date().toISOString().split("T")[0];
        const transacaoData = new Date(dateStr);
        const year = transacaoData.getFullYear();
        const month = String(transacaoData.getMonth() + 1).padStart(2, "0");
        const mes_referencia = `${year}-${month}`;

        if (mesFiltro && mes_referencia !== mesFiltro) {
          continue;
        }

        const desc = `${item.description || "Transferência / Despesa Asaas"} (Ref Asaas: ${asaasId})`;

        const { data: existingTx } = await supabase
          .from("transacoes_financeiras")
          .select("id")
          .or(`asaas_id.eq.${asaasId},descricao.ilike.%${asaasId}%`)
          .limit(1);

        if (!existingTx || existingTx.length === 0) {
          const txPayload: any = {
            tipo: "SAIDA",
            descricao: desc,
            valor: absValue,
            categoria: "Outros",
            status: "PENDENTE_APROVACAO",
            mes_referencia,
            data_transacao: dateStr,
            origem: "ASAAS",
            asaas_id: asaasId,
          };

          const { error: insErr } = await supabase.from("transacoes_financeiras").insert(txPayload);
          if (insErr) {
            delete txPayload.origem;
            delete txPayload.asaas_id;
            await supabase.from("transacoes_financeiras").insert(txPayload);
          }
          importedCount++;
        }
      }
    }

    return {
      success: true,
      importedCount,
      message: importedCount > 0 
        ? `${importedCount} nova(s) movimentação(ões) importada(s) com sucesso para aprovação.`
        : `Nenhuma nova transação pendente encontrada no Asaas para ${mesFiltro || 'o período'}.`,
    };
  } catch (err: any) {
    console.error("Erro ao sincronizar extrato Asaas:", err);
    return { success: false, importedCount: 0, message: err.message || "Erro de conexão com Asaas." };
  }
}

export async function cleanupDuplicateTransactions(): Promise<{ success: boolean; removedCount: number; message: string }> {
  try {
    const { data: allTransactions, error } = await supabase
      .from("transacoes_financeiras")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !allTransactions) {
      throw new Error(`Erro ao buscar transações: ${error?.message}`);
    }

    const idsToDelete: string[] = [];
    const seenAsaasIds = new Set<string>();
    const seenCotas = new Map<string, any>(); // key: mes_referencia + normalized_name -> tx

    for (const tx of allTransactions) {
      // 1. Deduplicação por asaas_id explícito ou ref no texto da descrição
      let asaasRef = tx.asaas_id;
      if (!asaasRef && tx.descricao) {
        const match = tx.descricao.match(/Ref Asaas:\s*([a-zA-Z0-9_]+)/i);
        if (match && match[1]) {
          asaasRef = match[1];
        }
      }

      if (asaasRef) {
        if (seenAsaasIds.has(asaasRef)) {
          idsToDelete.push(tx.id);
          continue;
        } else {
          seenAsaasIds.add(asaasRef);
        }
      }

      // 2. Deduplicação de Cota Condominial por mês e criador
      if (tx.categoria === "Cota Condominial" || (tx.descricao && tx.descricao.toLowerCase().includes("cota condominial"))) {
        // Extrair parte central do nome
        const cleanDesc = (tx.descricao || "")
          .replace(/cota condominial\s*-\s*/i, "")
          .replace(/\(Ref Asaas:[^)]+\)/i, "")
          .trim()
          .toLowerCase();

        const key = `${tx.mes_referencia || "mes"}_${cleanDesc}`;
        if (seenCotas.has(key)) {
          const existing = seenCotas.get(key);
          // Se o atual for REJEITADO ou PENDENTE enquanto o anterior é PAGO, exclui o atual
          if (existing.status === "PAGO" && tx.status !== "PAGO") {
            idsToDelete.push(tx.id);
          } else {
            // Caso contrário, exclui o mais antigo/duplicado
            idsToDelete.push(tx.id);
          }
          continue;
        } else {
          seenCotas.set(key, tx);
        }
      }
    }

    if (idsToDelete.length > 0) {
      // Executar exclusão em lotes
      for (const id of idsToDelete) {
        await supabase.from("transacoes_financeiras").delete().eq("id", id);
      }
    }

    return {
      success: true,
      removedCount: idsToDelete.length,
      message: idsToDelete.length > 0
        ? `Auditoria concluída: ${idsToDelete.length} transação(ões) duplicada(s) removida(s) com sucesso.`
        : "Auditoria concluída: Nenhuma transação duplicada encontrada no banco de dados.",
    };
  } catch (err: any) {
    console.error("Erro ao limpar duplicidades:", err);
    return { success: false, removedCount: 0, message: err.message || "Erro durante auditoria de duplicidades." };
  }
}

