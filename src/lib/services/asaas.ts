const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/v3";

function generateMockId(prefix: string): string {
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${randomStr}`;
}

export async function createCustomer(nome: string, email: string, cnpjCpf: string): Promise<string> {
  if (!ASAAS_API_KEY) {
    const mockId = generateMockId("cus");
    console.warn(`[Asaas Mock] Creating customer ${nome}. ID: ${mockId}`);
    return mockId;
  }

  const cleanCnpjCpf = cnpjCpf.replace(/\D/g, "");

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
