import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendNewTrainingNotification, sendIndividualTrainingReminderNotification } from '@/lib/services/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { condominoId, moduloId, moduloData, aulasData, adminName } = body;

    // =========================================================================
    // CASO 1: Notificação INDIVIDUAL para um criador específico
    // =========================================================================
    if (condominoId) {
      const { data: condomino, error: condError } = await supabase
        .from('condominos')
        .select('*')
        .eq('id', condominoId)
        .maybeSingle();

      if (condError || !condomino) {
        return NextResponse.json({ error: 'Condômino não encontrado' }, { status: 404 });
      }

      if (!condomino.email || !condomino.email.includes('@')) {
        return NextResponse.json({
          error: `O condômino ${condomino.nome_comercial} não possui um e-mail válido cadastrado.`
        }, { status: 400 });
      }

      // Se foi solicitado um módulo específico para o criador
      if (moduloId || moduloData) {
        let modulo = moduloData;
        if (!modulo && moduloId) {
          const { data: modDB } = await supabase
            .from('treinamento_modulos')
            .select('*')
            .eq('id', moduloId)
            .single();
          modulo = modDB;
        }

        let aulas = aulasData;
        if (!aulas && modulo?.id) {
          const { data: aulasDB } = await supabase
            .from('treinamento_aulas')
            .select('*')
            .eq('modulo_id', modulo.id)
            .order('ordem', { ascending: true });
          aulas = aulasDB || [];
        }

        if (modulo) {
          await sendNewTrainingNotification({
            modulo,
            aulas: aulas || [],
            recipients: [condomino.email]
          });

          return NextResponse.json({
            success: true,
            message: `Notificação da trilha "${modulo.titulo}" enviada para ${condomino.nome_comercial} (${condomino.email}) com sucesso!`
          });
        }
      }

      // Lembrete Geral de Treinamentos Obrigatórios Pendentes
      const { data: mandatoryModules } = await supabase
        .from('treinamento_modulos')
        .select('*')
        .eq('ativo', true)
        .eq('obrigatorio', true)
        .order('ordem', { ascending: true });

      const { data: userProgress } = await supabase
        .from('treinamento_progresso')
        .select('aula_id, concluido')
        .eq('condomino_id', condomino.id)
        .eq('concluido', true);

      const completedAulaIds = new Set((userProgress || []).map((p) => p.aula_id));

      const { data: allMandatoryAulas } = await supabase
        .from('treinamento_aulas')
        .select('*')
        .in('modulo_id', (mandatoryModules || []).map((m) => m.id));

      // Filtra quais módulos obrigatórios ainda têm aulas pendentes para esse criador
      const pendingModules = (mandatoryModules || []).filter((mod) => {
        const modAulas = (allMandatoryAulas || []).filter((a) => a.modulo_id === mod.id);
        if (modAulas.length === 0) return false;
        return modAulas.some((a) => !completedAulaIds.has(a.id));
      });

      await sendIndividualTrainingReminderNotification({
        creator: condomino,
        pendingModules: pendingModules.length > 0 ? pendingModules : (mandatoryModules || []),
        adminName
      });

      return NextResponse.json({
        success: true,
        message: `Lembrete de treinamento enviado com sucesso para ${condomino.nome_comercial} (${condomino.email})!`
      });
    }

    // =========================================================================
    // CASO 2: Notificação em MASSA de Módulo para todos os criadores
    // =========================================================================
    if (!moduloId && !moduloData) {
      return NextResponse.json({ error: 'Módulo não informado para envio em massa' }, { status: 400 });
    }

    let modulo = moduloData;
    if (!modulo && moduloId) {
      const { data: modDB } = await supabase
        .from('treinamento_modulos')
        .select('*')
        .eq('id', moduloId)
        .single();
      modulo = modDB;
    }

    if (!modulo) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    let aulas = aulasData;
    if (!aulas && modulo.id) {
      const { data: aulasDB } = await supabase
        .from('treinamento_aulas')
        .select('*')
        .eq('modulo_id', modulo.id)
        .order('ordem', { ascending: true });
      aulas = aulasDB || [];
    }

    // Buscar condôminos
    const { data: condominos } = await supabase
      .from('condominos')
      .select('email, nome_comercial, status');

    let recipientEmails: string[] = [];
    if (condominos && condominos.length > 0) {
      recipientEmails = condominos
        .map((c) => c.email?.trim())
        .filter((email): email is string => Boolean(email && email.includes('@')));
    }

    if (recipientEmails.length === 0) {
      const adminList = process.env.ADMIN_EMAILS
        ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
        : [];
      recipientEmails = adminList;
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({
        error: 'Nenhum e-mail de criador encontrado para envio.'
      }, { status: 400 });
    }

    await sendNewTrainingNotification({
      modulo,
      aulas: aulas || [],
      recipients: recipientEmails
    });

    return NextResponse.json({
      success: true,
      message: `Notificação enviada com sucesso para ${recipientEmails.length} destinatário(s).`,
      count: recipientEmails.length,
      recipients: recipientEmails
    });
  } catch (err: any) {
    console.error('Erro ao notificar criadores sobre treinamento:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao disparar e-mails' }, { status: 500 });
  }
}
