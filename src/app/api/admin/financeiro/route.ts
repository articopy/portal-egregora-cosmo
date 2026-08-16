import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem acessar o controle financeiro." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes"); // e.g. "2026-07"

    let query = supabase
      .from("transacoes_financeiras")
      .select("*")
      .order("data_transacao", { ascending: false })
      .order("created_at", { ascending: false });

    if (mes) {
      query = query.or(`mes_referencia.eq.${mes},status.eq.PENDENTE_APROVACAO`);
    }

    const { data: transacoes, error } = await query;

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(transacoes);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem lançar transações." }, { status: 403 });
    }

    const body = await request.json();
    const { tipo, descricao, valor, categoria, status, data_transacao } = body;

    // Validation
    if (!tipo || !["ENTRADA", "SAIDA"].includes(tipo)) {
      return NextResponse.json({ detail: "Tipo inválido. Deve ser 'ENTRADA' ou 'SAIDA'." }, { status: 400 });
    }
    if (!descricao || descricao.trim() === "") {
      return NextResponse.json({ detail: "Descrição obrigatória." }, { status: 400 });
    }
    if (typeof valor !== "number" || valor <= 0) {
      return NextResponse.json({ detail: "Valor inválido. Deve ser maior que 0." }, { status: 400 });
    }
    if (!categoria || categoria.trim() === "") {
      return NextResponse.json({ detail: "Categoria obrigatória." }, { status: 400 });
    }

    const transacaoData = new Date(data_transacao || new Date());
    const year = transacaoData.getFullYear();
    const month = String(transacaoData.getMonth() + 1).padStart(2, "0");
    const mes_referencia = `${year}-${month}`;

    const { data: newTransacao, error } = await supabase
      .from("transacoes_financeiras")
      .insert({
        tipo,
        descricao,
        valor,
        categoria,
        status: status || "PAGO",
        data_transacao: data_transacao || new Date().toISOString().split("T")[0],
        mes_referencia,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(newTransacao, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
