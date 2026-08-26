import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendDoubtSubmittedNotification, sendDoubtAnsweredNotification } from "@/lib/services/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      aula_id,
      autor_id,
      autor_nome,
      autor_email,
      autor_role,
      comentario,
      resposta_de_id,
      aula_titulo,
      modulo_titulo,
      duvida_original_texto,
      criador_original_email,
      criador_original_nome
    } = body;

    if (!aula_id || !comentario) {
      return NextResponse.json({ error: "Aula e Comentário são obrigatórios" }, { status: 400 });
    }

    let finalAutorNome = autor_nome || "Criador";
    let finalAutorId = autor_id || null;
    let finalAutorEmail = autor_email || null;
    let finalAutorRole = autor_role || "creator";

    // Validar e enriquecer os dados do criador na tabela condominos
    if (finalAutorRole !== "admin") {
      if (finalAutorEmail) {
        const { data: condByEmail } = await supabase
          .from("condominos")
          .select("id, nome_comercial, email")
          .ilike("email", finalAutorEmail.trim())
          .maybeSingle();

        if (condByEmail) {
          finalAutorNome = condByEmail.nome_comercial;
          finalAutorId = condByEmail.id;
          finalAutorEmail = condByEmail.email;
        }
      } else if (finalAutorId) {
        const { data: condById } = await supabase
          .from("condominos")
          .select("id, nome_comercial, email")
          .eq("id", finalAutorId)
          .maybeSingle();

        if (condById) {
          finalAutorNome = condById.nome_comercial;
          finalAutorEmail = condById.email;
        }
      }
    }

    // 1. Inserir comentário no Supabase
    const { data: newComment, error: insertErr } = await supabase
      .from("treinamento_comentarios")
      .insert({
        aula_id,
        autor_id: finalAutorId,
        autor_nome: finalAutorNome,
        autor_role: finalAutorRole,
        comentario: comentario.trim(),
        resposta_de_id: resposta_de_id || null
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Erro ao salvar comentário no Supabase:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 2. Disparar Notificações por E-mail em background
    if (resposta_de_id) {
      // CASO A: Administrador respondendo ao criador
      let targetEmail = criador_original_email;
      let targetName = criador_original_nome || "Criador";
      let originalQuestion = duvida_original_texto || "";

      // Busca o comentário pai no banco para garantir autoridade dos dados
      const { data: parentComment } = await supabase
        .from("treinamento_comentarios")
        .select("*")
        .eq("id", resposta_de_id)
        .single();

      if (parentComment) {
        originalQuestion = parentComment.comentario || originalQuestion;
        targetName = parentComment.autor_nome || targetName;

        if (parentComment.autor_id) {
          const { data: cond } = await supabase
            .from("condominos")
            .select("email, nome_comercial, nome_completo")
            .eq("id", parentComment.autor_id)
            .maybeSingle();

          if (cond) {
            if (cond.email) targetEmail = cond.email;
            if (cond.nome_comercial) targetName = cond.nome_comercial;
          }
        }
      }

      if (targetEmail) {
        sendDoubtAnsweredNotification({
          creatorName: targetName,
          creatorEmail: targetEmail,
          aulaTitulo: aula_titulo || "Videoaula",
          moduloTitulo: modulo_titulo,
          duvidaTexto: originalQuestion,
          respostaTexto: comentario.trim(),
          adminName: finalAutorNome || "Administração Cosmo Alma TV"
        }).catch((e) => console.error("Erro ao notificar resposta ao criador:", e));
      }
    } else {
      // CASO B: Novo comentário / dúvida enviado pelo criador
      sendDoubtSubmittedNotification({
        creatorName: finalAutorNome,
        creatorEmail: finalAutorEmail || undefined,
        aulaTitulo: aula_titulo || "Videoaula",
        moduloTitulo: modulo_titulo,
        duvidaTexto: comentario.trim()
      }).catch((e) => console.error("Erro ao disparar notificações de dúvida:", e));
    }

    return NextResponse.json({
      success: true,
      comment: newComment
    });
  } catch (err: any) {
    console.error("Erro na rota de comentários:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
