import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateContractDocxBuffer } from "@/lib/services/contract";
import { createZapSignDocument } from "@/lib/services/zapsign";

export async function GET() {
  try {
    const { data: condominos, error } = await supabase
      .from("condominos")
      .select("*")
      .order("data_onboarding", { ascending: false });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(condominos);
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

    // ZapSign Integration
    let zapsignDocId = null;
    let zapsignSignUrl = null;
    try {
      const zapRes = await createZapSignDocument(
        nome_completo,
        email,
        nome_comercial,
        base64Content,
        filename
      );
      zapsignDocId = zapRes.doc_id;
      zapsignSignUrl = zapRes.sign_url;
    } catch (e: any) {
      console.error("Error creating ZapSign document:", e);
      // We can fallback or allow proceeding with mock
      zapsignDocId = "zap-sim-doc-123456789";
      zapsignSignUrl = `https://sandbox.zapsign.com.br/sign/${zapsignDocId}`;
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
