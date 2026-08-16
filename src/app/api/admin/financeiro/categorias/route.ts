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
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem acessar as categorias." }, { status: 403 });
    }

    const { data: categorias, error } = await supabase
      .from("categorias_financeiras")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(categorias);
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
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem gerenciar categorias." }, { status: 403 });
    }

    const body = await request.json();
    const { nome, tipo } = body;

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ detail: "Nome da categoria obrigatório." }, { status: 400 });
    }
    if (!tipo || !["ENTRADA", "SAIDA"].includes(tipo)) {
      return NextResponse.json({ detail: "Tipo inválido. Deve ser 'ENTRADA' ou 'SAIDA'." }, { status: 400 });
    }

    const { data: newCategoria, error } = await supabase
      .from("categorias_financeiras")
      .insert({
        nome: nome.trim(),
        tipo
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ detail: "Já existe uma categoria cadastrada com este nome." }, { status: 400 });
      }
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(newCategoria, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
