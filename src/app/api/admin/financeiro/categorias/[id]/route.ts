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
      return NextResponse.json({ detail: "Acesso proibido. Apenas administradores podem excluir categorias." }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("categorias_financeiras")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Categoria excluída com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
