import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateContractDocxBuffer } from "@/lib/services/contract";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the condomino
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !condomino) {
      return NextResponse.json({ detail: "Condômino não encontrado." }, { status: 404 });
    }

    // Se o status for de onboarding (aguardando assinatura ou pendente do primeiro pagamento),
    // permitimos o download público sem autenticação para apoiar o fluxo imediato de cadastro.
    const isOnboarding = condomino.status === "AGUARDANDO_ASSINATURA" || condomino.status === "ATIVO_PENDENTE_PAGAMENTO";

    if (!isOnboarding) {
      // Exige autenticação para os demais status
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
      }

      const isAdmin = isUserAdmin(user);
      const isOwnRecord = condomino.email?.toLowerCase() === user.email?.toLowerCase();

      if (!isAdmin && !isOwnRecord) {
        return NextResponse.json({ detail: "Acesso proibido. Você não tem permissão para baixar este contrato." }, { status: 403 });
      }
    }

    // Generate contract DOCX buffer dynamically
    const buffer = generateContractDocxBuffer({
      nomeCompleto: condomino.nome_completo,
      nomeComercial: condomino.nome_comercial,
      razaoSocial: condomino.razao_social,
      cnpjCpf: condomino.cnpj_cpf,
      email: condomino.email,
      chavePix: condomino.chave_pix,
      youtubeId: condomino.youtube_id,
      genero: condomino.genero,
      estadoCivil: condomino.estado_civil,
      cep: condomino.cep,
      endereco: condomino.endereco,
      cidade: condomino.cidade,
      uf: condomino.uf,
      pais: condomino.pais,
    });

    const filename = condomino.contrato_path || `contrato_${condomino.nome_comercial.toLowerCase().replace(/\s+/g, "_")}.docx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Error downloading contract:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
