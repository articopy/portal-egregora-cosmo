import { NextResponse } from "next/server";
import { generateContractDocxBuffer } from "@/lib/services/contract";
import { createAssinafyDocument } from "@/lib/services/assinafy";

export async function POST() {
  try {
    const testData = {
      nome_completo: "Condômino Teste Assinafy",
      nome_comercial: "Canal Teste Assinafy",
      razao_social: "Empresa Teste Assinafy Ltda",
      cnpj_cpf: "11.111.111/0001-11",
      email: "teste-assinafy@cosmoalmatv.com.br",
      youtube_id: "UC_teste_assinafy_123",
      chave_pix: "teste-assinafy@cosmoalmatv.com.br",
      genero: "M",
      estado_civil: "solteiro",
      cep: "22441-000",
      endereco: "Avenida Edson Passos, 100",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      pais: "Brasil"
    };

    // 1. Test DOCX generation
    let docBuffer: Buffer;
    try {
      docBuffer = generateContractDocxBuffer({
        nomeCompleto: testData.nome_completo,
        nomeComercial: testData.nome_comercial,
        razaoSocial: testData.razao_social,
        cnpjCpf: testData.cnpj_cpf,
        email: testData.email,
        chavePix: testData.chave_pix,
        youtubeId: testData.youtube_id,
        genero: testData.genero,
        estadoCivil: testData.estado_civil,
        cep: testData.cep,
        endereco: testData.endereco,
        cidade: testData.cidade,
        uf: testData.uf,
        pais: testData.pais,
      });
    } catch (e: any) {
      console.error("[Test Assinafy] Error generating docx:", e);
      return NextResponse.json({
        success: false,
        error: `Erro na geração do arquivo DOCX: ${e.message}`
      }, { status: 500 });
    }

    const base64Content = docBuffer.toString("base64");
    const filename = `contrato_teste_assinafy.docx`;

    // 2. Assinafy API Integration
    const zapRes = await createAssinafyDocument(
      testData.nome_completo,
      testData.email,
      testData.nome_comercial,
      base64Content,
      filename
    );

    return NextResponse.json({
      success: true,
      mode: zapRes.status === "simulated" ? "Simulação (Chave de API ausente)" : "Produção/Real",
      doc_id: zapRes.doc_id,
      sign_url: zapRes.sign_url,
      message: "Documento de teste gerado com sucesso no Assinafy!"
    });
  } catch (err: any) {
    console.error("[Test Assinafy] Endpoint error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Erro desconhecido ao testar Assinafy."
    }, { status: 500 });
  }
}
