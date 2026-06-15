import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateContractDocxBuffer } from "@/lib/services/contract";
import { createAssinafyDocument } from "@/lib/services/assinafy";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";
import { fetchWeeklyUploadsCount } from "@/lib/services/youtube";

// Helper to enrich condomino with weekly video upload counts
async function enrichCondominoWithDeliveries(c: any, semanaCodigo: string, publishedAfterStr: string) {
  if (c.status !== "ATIVO_ADIMPLENTE" && c.status !== "BLOQUEADO_ASSIDUIDADE") {
    return { ...c, videos_entregues_esta_semana: 0 };
  }

  // Check database first
  const { data: delivery } = await supabase
    .from("entregas_video")
    .select("qtd_entregue")
    .eq("condomino_id", c.id)
    .eq("semana_codigo", semanaCodigo)
    .maybeSingle();

  if (delivery) {
    return { ...c, videos_entregues_esta_semana: delivery.qtd_entregue };
  }

  // If not found in DB, query YouTube live (and cache in DB)
  try {
    const youtubeId = c.youtube_id || `mock_chan_${c.nome_comercial.toLowerCase()}`;
    const uploadsCount = await fetchWeeklyUploadsCount(youtubeId, publishedAfterStr);
    
    // Save to DB so it is cached
    const isValid = uploadsCount >= 1;
    await supabase.from("entregas_video").insert({
      condomino_id: c.id,
      semana_codigo: semanaCodigo,
      qtd_entregue: uploadsCount,
      status_valido: isValid,
    });

    return { ...c, videos_entregues_esta_semana: uploadsCount };
  } catch (err) {
    console.error(`Error fetching/caching live uploads for condomino ${c.id}:`, err);
    return { ...c, videos_entregues_esta_semana: 2 }; // Safe fallback
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    const isAdmin = isUserAdmin(user);

    // Calculate current ISO week code and date range (last 7 days)
    const today = new Date();
    const target = new Date(today.valueOf());
    const dayNr = (today.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = today.getFullYear();
    const semanaCodigo = `${year}-W${String(weekNum).padStart(2, "0")}`;

    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const publishedAfterStr = sevenDaysAgo.toISOString();

    if (isAdmin) {
      const { data: condominos, error } = await supabase
        .from("condominos")
        .select("*")
        .order("data_onboarding", { ascending: false });

      if (error) {
        return NextResponse.json({ detail: error.message }, { status: 500 });
      }

      const enriched = await Promise.all(
        condominos.map((c: any) => enrichCondominoWithDeliveries(c, semanaCodigo, publishedAfterStr))
      );

      return NextResponse.json(enriched);
    } else {
      // Se for condômino, retorna apenas o seu próprio registro em formato de array
      const { data: condominos, error } = await supabase
        .from("condominos")
        .select("*")
        .eq("email", user.email)
        .order("data_onboarding", { ascending: false });

      if (error) {
        return NextResponse.json({ detail: error.message }, { status: 500 });
      }

      const enriched = await Promise.all(
        condominos.map((c: any) => enrichCondominoWithDeliveries(c, semanaCodigo, publishedAfterStr))
      );

      return NextResponse.json(enriched);
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nome_completo,
      nome_comercial,
      razao_social,
      cnpj_cpf,
      email,
      youtube_id,
      chave_pix,
      genero,
      estado_civil,
      cep,
      endereco,
      cidade,
      uf,
      pais,
    } = body;

    // Validate Email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "Formato de e-mail inválido." }, { status: 400 });
    }

    // Validate CPF/CNPJ
    const cleanDoc = (cnpj_cpf || "").replace(/\D/g, "");
    if (cleanDoc.length === 11) {
      if (!isValidCpf(cleanDoc)) {
        return NextResponse.json({ detail: "CPF informado é inválido matematicamente." }, { status: 400 });
      }
    } else if (cleanDoc.length === 14) {
      if (!isValidCnpj(cleanDoc)) {
        return NextResponse.json({ detail: "CNPJ informado é inválido matematicamente." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ detail: "Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido." }, { status: 400 });
    }

    // Check existing CNPJ/CPF
    const { data: existingCnpjCpf } = await supabase
      .from("condominos")
      .select("id")
      .eq("cnpj_cpf", cnpj_cpf)
      .maybeSingle();

    if (existingCnpjCpf) {
      return NextResponse.json({ detail: "CNPJ/CPF já cadastrado." }, { status: 400 });
    }

    // Check existing email
    const { data: existingEmail } = await supabase
      .from("condominos")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json({ detail: "E-mail já cadastrado." }, { status: 400 });
    }

    // Generate contract DOCX buffer
    let docBuffer: Buffer;
    try {
      docBuffer = generateContractDocxBuffer({
        nomeCompleto: nome_completo,
        nomeComercial: nome_comercial,
        razaoSocial: razao_social,
        cnpjCpf: cnpj_cpf,
        email: email,
        chavePix: chave_pix,
        youtubeId: youtube_id,
        genero,
        estadoCivil: estado_civil,
        cep,
        endereco,
        cidade,
        uf,
        pais,
      });
    } catch (e: any) {
      console.error("Error generating contract DOCX:", e);
      return NextResponse.json({ detail: `Erro ao gerar minuta do contrato: ${e.message}` }, { status: 500 });
    }

    // Convert to Base64 for ZapSign
    const base64Content = docBuffer.toString("base64");
    const filename = `contrato_${nome_comercial.toLowerCase().replace(/\s+/g, "_")}.docx`;

    // Assinafy Integration
    let zapsignDocId = null;
    let zapsignSignUrl = null;
    try {
      const zapRes = await createAssinafyDocument(
        nome_completo,
        email,
        nome_comercial,
        base64Content,
        filename
      );
      
      if (zapRes.status === "simulated") {
        console.warn("[Assinafy] Running in simulation mode because ASSINAFY_API_KEY or ASSINAFY_ACCOUNT_ID is not defined.");
      }
      
      zapsignDocId = zapRes.doc_id;
      zapsignSignUrl = zapRes.sign_url;
    } catch (e: any) {
      console.error("Error creating Assinafy document:", e);
      return NextResponse.json({ 
        detail: `Erro ao criar documento no Assinafy. Verifique as credenciais ASSINAFY_API_KEY e ASSINAFY_ACCOUNT_ID. Detalhes: ${e.message}` 
      }, { status: 500 });
    }

    // Save in Supabase
    const { data: newCondomino, error: insertError } = await supabase
      .from("condominos")
      .insert({
        nome_completo,
        nome_comercial,
        razao_social: razao_social || nome_completo,
        cnpj_cpf,
        email,
        status: "AGUARDANDO_ASSINATURA",
        zapsign_doc_id: zapsignDocId,
        zapsign_sign_url: zapsignSignUrl,
        youtube_id,
        chave_pix,
        contrato_path: filename, // Save filename as identifier
        genero,
        estado_civil,
        cep,
        endereco,
        cidade,
        uf,
        pais: pais || "Brasil",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ detail: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newCondomino, { status: 201 });
  } catch (err: any) {
    console.error("Endpoint crash:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}
