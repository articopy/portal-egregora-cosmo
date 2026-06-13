import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

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

    return NextResponse.json(condomino);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem excluir condôminos." }, { status: 403 });
    }

    const { id } = await params;
    
    // Delete condomino (cascade deletes entregas_video if configured in DB, else manual)
    const { error } = await supabase
      .from("condominos")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Condômino removido com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
