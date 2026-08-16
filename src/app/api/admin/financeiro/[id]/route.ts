import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem excluir transações." }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("transacoes_financeiras")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Transação excluída com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem alterar transações." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, descricao, valor, categoria, data_transacao } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (descricao) updateData.descricao = descricao;
    if (typeof valor === "number" && valor > 0) updateData.valor = valor;
    if (categoria) updateData.categoria = categoria;
    if (data_transacao) {
      updateData.data_transacao = data_transacao;
      const transacaoData = new Date(data_transacao);
      const year = transacaoData.getFullYear();
      const month = String(transacaoData.getMonth() + 1).padStart(2, "0");
      updateData.mes_referencia = `${year}-${month}`;
    }

    const { data: updatedTransacao, error } = await supabase
      .from("transacoes_financeiras")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedTransacao);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
