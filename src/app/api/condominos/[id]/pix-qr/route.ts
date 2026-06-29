import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";
import { getPendingPixQrCode, checkPaymentStatus } from "@/lib/services/asaas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    const { id } = await params;
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    if (!condomino) {
      return NextResponse.json({ detail: "Condômino não encontrado." }, { status: 404 });
    }

    const isAdmin = isUserAdmin(user);
    const isOwnRecord = condomino.email?.toLowerCase() === user.email?.toLowerCase();

    if (!isAdmin && !isOwnRecord) {
      return NextResponse.json({ detail: "Acesso proibido. Você não tem permissão para visualizar este perfil." }, { status: 403 });
    }

    const asaasId = condomino.asaas_id;
    if (!asaasId) {
      return NextResponse.json({ detail: "Este criador não possui um cadastro vinculado no Asaas." }, { status: 400 });
    }

    // Autodetect paid status (self-healing)
    if (condomino.status === "ATIVO_PENDENTE_PAGAMENTO") {
      const hasPaid = await checkPaymentStatus(asaasId);
      if (hasPaid) {
        await supabase
          .from("condominos")
          .update({ status: "ATIVO_ADIMPLENTE" })
          .eq("id", condomino.id);

        return NextResponse.json({
          success: true,
          status: "RECEIVED",
          detail: "Pagamento confirmado com sucesso! Recarregando a página...",
        });
      }
    }

    const qrInfo = await getPendingPixQrCode(asaasId);
    return NextResponse.json(qrInfo);
  } catch (err: any) {
    console.error("[Pix QR API Error]:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
