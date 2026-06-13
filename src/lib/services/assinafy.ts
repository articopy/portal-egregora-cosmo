import { createCustomer, createSubscription } from "./asaas";

const ASSINAFY_API_KEY = (process.env.ASSINAFY_API_KEY || "").trim();
const ASSINAFY_ACCOUNT_ID = (process.env.ASSINAFY_ACCOUNT_ID || "").trim();
const ASSINAFY_API_URL = (process.env.ASSINAFY_API_URL || "https://api.assinafy.com.br/v1").trim();

export async function createAssinafyDocument(
  nomeCompleto: string,
  email: string,
  nomeComercial: string,
  contratoBase64: string,
  filename: string
): Promise<{ status: string; doc_id: string; sign_url: string }> {
  // Simulation Mode if credentials are not provided
  if (!ASSINAFY_API_KEY || !ASSINAFY_ACCOUNT_ID) {
    console.warn("[Assinafy Integration] Running in Simulation Mode (Credentials missing).");
    const simulatedDocId = "assinafy-sim-doc-123456789";
    const simulatedSignUrl = `https://sandbox.assinafy.com.br/sign/${simulatedDocId}`;
    return {
      status: "simulated",
      doc_id: simulatedDocId,
      sign_url: simulatedSignUrl,
    };
  }

  // 1. Construct multipart/form-data body manually using Buffer to support all Node.js versions
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2, 15)}`;
  const fileBuffer = Buffer.from(contratoBase64, "base64");

  const header = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(header, "utf-8"),
    fileBuffer,
    Buffer.from(footer, "utf-8")
  ]);

  // 2. Upload Document
  console.log(`[Assinafy] Uploading document: ${filename}`);
  const uploadRes = await fetch(`${ASSINAFY_API_URL}/accounts/${ASSINAFY_ACCOUNT_ID}/documents`, {
    method: "POST",
    headers: {
      "X-Api-Key": ASSINAFY_API_KEY,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Assinafy Upload Error: ${errorText}`);
  }

  const uploadData = await uploadRes.json();
  // Depending on response wrapper status / data
  const docData = uploadData.data || uploadData;
  const documentId = docData.id;

  if (!documentId) {
    throw new Error(`Assinafy Upload response does not contain a document ID: ${JSON.stringify(uploadData)}`);
  }

  // 3. Create Signer in workspace
  console.log(`[Assinafy] Creating signer: ${nomeCompleto} (${email})`);
  const signerRes = await fetch(`${ASSINAFY_API_URL}/accounts/${ASSINAFY_ACCOUNT_ID}/signers`, {
    method: "POST",
    headers: {
      "X-Api-Key": ASSINAFY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: nomeCompleto,
      email: email,
    }),
  });

  let signerId = "";

  if (!signerRes.ok) {
    const errorText = await signerRes.text();
    let isAlreadyExists = false;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.message && errJson.message.toLowerCase().includes("já existe")) {
        isAlreadyExists = true;
      }
    } catch (_) {}

    if (isAlreadyExists) {
      console.log(`[Assinafy] Signer with email ${email} already exists. Searching to reuse ID...`);
      const searchRes = await fetch(`${ASSINAFY_API_URL}/accounts/${ASSINAFY_ACCOUNT_ID}/signers?search=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "X-Api-Key": ASSINAFY_API_KEY,
        },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const list = searchData.data || [];
        const matchedSigner = list.find((s: any) => s.email && s.email.toLowerCase() === email.toLowerCase());
        if (matchedSigner) {
          signerId = matchedSigner.id;
          console.log(`[Assinafy] Reusing existing signer ID: ${signerId}`);
        }
      }
    }

    if (!signerId) {
      throw new Error(`Assinafy Signer Creation Error: ${errorText}`);
    }
  } else {
    const signerData = await signerRes.json();
    const signerObj = signerData.data || signerData;
    signerId = signerObj.id;
  }

  if (!signerId) {
    throw new Error(`Assinafy Signer response does not contain a signer ID.`);
  }

  // 4. Request Signatures (Assignment)
  console.log(`[Assinafy] Requesting signature (assignment) for document ${documentId}`);
  const assignmentRes = await fetch(`${ASSINAFY_API_URL}/documents/${documentId}/assignments`, {
    method: "POST",
    headers: {
      "X-Api-Key": ASSINAFY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "virtual",
      signerIds: [signerId],
    }),
  });

  if (!assignmentRes.ok) {
    const errorText = await assignmentRes.text();
    throw new Error(`Assinafy Assignment Error: ${errorText}`);
  }

  const assignmentData = await assignmentRes.json();
  const assignObj = assignmentData.data || assignmentData;
  
  // Extract signing URL
  const signingUrls = assignObj.signing_urls || assignObj.assignment?.signing_urls || [];
  const signingUrlObj = signingUrls.find((u: any) => u.signer_id === signerId) || signingUrls[0];
  const signUrl = signingUrlObj?.url || "";

  if (!signUrl) {
    throw new Error(`Assinafy signing URL not found in response: ${JSON.stringify(assignmentData)}`);
  }

  console.log(`[Assinafy] Document ready. ID: ${documentId}, URL: ${signUrl}`);

  return {
    status: "success",
    doc_id: documentId,
    sign_url: signUrl,
  };
}
