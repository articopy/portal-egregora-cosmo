import { NextResponse } from "next/server";
import { generateContractDocxBuffer } from "@/lib/services/contract";
import { createZapSignDocument } from "@/lib/services/zapsign";

export async function POST() {
  try {
    const testData = {
      nome_completo: "Condômino Teste ZapSign",
      nome_comercial: "Canal Teste ZapSign",
      razao_social: "Empresa Teste ZapSign Ltda",
      cnpj_cpf: "11.111.111/0001-11",
      email: "teste-zapsign@cosmoalmatv.com.br",
      youtube_id: "UC_teste_zapsign_123",
      chave_pix: "teste-zapsign@cosmoalmatv.com.br",
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
      console.error("[Test ZapSign] Error generating docx:", e);
      return NextResponse.json({
        success: false,
        error: `Erro na geração do arquivo DOCX: ${e.message}`
      }, { status: 500 });
    }

    const base64Content = docBuffer.toString("base64");
    const filename = `contrato_teste_zapsign.docx`;

    // 2. ZapSign API Integration
    const zapRes = await createZapSignDocument(
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
      message: "Documento de teste gerado com sucesso no ZapSign!"
    });
  } catch (err: any) {
    console.error("[Test ZapSign] Endpoint error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Erro desconhecido ao testar ZapSign."
    }, { status: 500 });
  }
}
