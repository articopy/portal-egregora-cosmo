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
