const ZAPSIGN_API_KEY = process.env.ZAPSIGN_API_KEY || "";
const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1/docs";

export async function createZapSignDocument(
  nomeCompleto: string,
  email: string,
  nomeComercial: string,
  contratoBase64: string, // We pass base64 content directly instead of path
  filename: string
): Promise<{ status: string; doc_id: string; sign_url: string }> {
  if (!ZAPSIGN_API_KEY) {
    console.warn("[ZapSign Integration] Running in Simulation Mode (No API key provided).");
    const simulatedDocId = "zap-sim-doc-123456789";
    const simulatedSignUrl = `https://sandbox.zapsign.com.br/sign/${simulatedDocId}`;
    return {
      status: "simulated",
      doc_id: simulatedDocId,
      sign_url: simulatedSignUrl,
    };
  }

  const payload = {
    name: `Contrato Cosmo Alma TV - ${nomeComercial}`,
    base64_pdf: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${contratoBase64}`,
    signers: [
      {
        name: nomeCompleto,
        email: email,
        send_email: true,
        auth_mode: "signature",
      },
    ],
  };

  const response = await fetch(ZAPSIGN_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ZAPSIGN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ZapSign Integration] Error creating document: ${errorText}`);
    throw new Error(`ZapSign API Error: ${errorText}`);
  }

  const data = await response.json();
  const docId = data.token;
  const signers = data.signers || [];
  const signUrl = signers[0]?.sign_url || "";

  return {
    status: "success",
    doc_id: docId,
    sign_url: signUrl,
  };
}
