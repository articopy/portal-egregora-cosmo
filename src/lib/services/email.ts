import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || `"Portal Egrégora" <${user}>`;
const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
  : [];

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!host || !user || !pass) {
    console.warn("[SMTP] Configurações de SMTP ausentes. E-mail não enviado.");
    return null;
  }

  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Adding tls rejectUnauthorized false is sometimes needed for custom cpanel/mail servers.
    // We keep it default, but add a fallback config if needed.
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`[SMTP] E-mail enviado para ${Array.isArray(to) ? to.join(", ") : to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("[SMTP] Erro ao enviar e-mail:", error);
    throw error;
  }
}

// Templates helper with "Mística Corporativa" look: dark mode, golden highlight (#E2B042), purple card (#1A1D29)
function getBaseTemplate(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            background-color: #111622;
            color: #FFFFFF;
            font-family: 'Josefin Sans', 'Inter', Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1A1D29;
            border: 1px solid #2D3142;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #E2B042;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #E2B042;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .title {
            color: #E2B042;
            font-size: 20px;
            margin-top: 10px;
            text-align: center;
          }
          .content {
            line-height: 1.6;
            font-size: 15px;
            color: #ECE8F5;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #111622;
            border-radius: 8px;
            overflow: hidden;
          }
          .details-table th, .details-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #2D3142;
          }
          .details-table th {
            color: #E2B042;
            font-weight: 600;
            width: 35%;
            border-right: 1px solid #2D3142;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .badge-pending {
            background-color: #D69E2E;
            color: #111622;
          }
          .badge-signed {
            background-color: #38A169;
            color: #FFFFFF;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #2D3142;
            padding-top: 20px;
            font-size: 12px;
            color: #718096;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">COSMO ALMA TV</div>
            <div class="title">${title}</div>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            Este é um e-mail automático enviado pelo Portal Egrégora Cosmo Alma TV.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendCreatorRegisteredNotification(creator: any) {
  if (adminEmails.length === 0) {
    console.warn("[SMTP] Lista de ADMIN_EMAILS vazia. Notificação de cadastro não enviada.");
    return null;
  }

  const subject = `✨ Novo Criador Cadastrado: ${creator.nome_comercial}`;
  
  const contentHtml = `
    <p>Olá, administradores,</p>
    <p>Um novo criador de conteúdo acabou de se cadastrar no portal e a minuta do contrato foi gerada. Ele está aguardando a assinatura eletrônica para prosseguir.</p>
    
    <table class="details-table">
      <tr>
        <th>Nome Comercial</th>
        <td><strong>${creator.nome_comercial}</strong></td>
      </tr>
      <tr>
        <th>Nome Completo</th>
        <td>${creator.nome_completo}</td>
      </tr>
      <tr>
        <th>CNPJ / CPF</th>
        <td>${creator.cnpj_cpf}</td>
      </tr>
      <tr>
        <th>E-mail</th>
        <td>${creator.email}</td>
      </tr>
      <tr>
        <th>Telefone</th>
        <td>${creator.telefone}</td>
      </tr>
      <tr>
        <th>ID do YouTube</th>
        <td><code>${creator.youtube_id || "Não informado"}</code></td>
      </tr>
      <tr>
        <th>Chave PIX</th>
        <td><code>${creator.chave_pix || "Não informada"}</code></td>
      </tr>
      <tr>
        <th>Status Atual</th>
        <td><span class="badge badge-pending">Aguardando Assinatura</span></td>
      </tr>
    </table>
    
    <p>O link do documento para assinatura no Assinafy foi enviado para o e-mail do criador.</p>
  `;

  return sendEmail({
    to: adminEmails,
    subject,
    html: getBaseTemplate("Novo Onboarding Iniciado", contentHtml),
  });
}

export async function sendCreatorSignedNotification(creator: any) {
  if (adminEmails.length === 0) {
    console.warn("[SMTP] Lista de ADMIN_EMAILS vazia. Notificação de assinatura não enviada.");
    return null;
  }

  const subject = `✍️ Contrato Assinado por: ${creator.nome_comercial}`;

  const contentHtml = `
    <p>Olá, administradores,</p>
    <p>Excelente notícia! O criador de conteúdo assinou o contrato. O motor financeiro já realizou a integração com o Asaas, criando o cadastro do cliente e a assinatura da cota recorrente.</p>
    
    <table class="details-table">
      <tr>
        <th>Nome Comercial</th>
        <td><strong>${creator.nome_comercial}</strong></td>
      </tr>
      <tr>
        <th>Nome Completo</th>
        <td>${creator.nome_completo}</td>
      </tr>
      <tr>
        <th>E-mail</th>
        <td>${creator.email}</td>
      </tr>
      <tr>
        <th>ID do Cliente Asaas</th>
        <td><code>${creator.asaas_id || "Criado no Asaas"}</code></td>
      </tr>
      <tr>
        <th>Status Atual</th>
        <td><span class="badge badge-signed">Ativo - Pendente Pagamento</span></td>
      </tr>
    </table>
    
    <p>O criador agora aguarda a compensação do primeiro pagamento mensal para se tornar <strong>ATIVO ADIMPLENTE</strong>.</p>
  `;

  return sendEmail({
    to: adminEmails,
    subject,
    html: getBaseTemplate("Contrato Assinado & Integrado", contentHtml),
  });
}

export async function sendNewTrainingNotification({
  modulo,
  aulas = [],
  recipients
}: {
  modulo: any;
  aulas?: any[];
  recipients: string[];
}) {
  if (!recipients || recipients.length === 0) {
    console.warn("[SMTP] Lista de destinatários vazia. Notificação de treinamento não enviada.");
    return null;
  }

  const subject = `🎬 Novo Treinamento Disponível: ${modulo.icone || "✨"} ${modulo.titulo}`;

  const lessonsListHtml = aulas.length > 0
    ? `
      <div style="margin: 20px 0; background-color: #111622; border-radius: 8px; padding: 15px; border: 1px solid #2D3142;">
        <h4 style="color: #E2B042; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">Aulas Inclusas nesta Trilha:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #ECE8F5; font-size: 14px;">
          ${aulas.map((a, i) => `
            <li style="margin-bottom: 6px;">
              <strong>Aula #${a.ordem || i + 1}:</strong> ${a.titulo} 
              <span style="color: #E2B042; font-size: 12px;">(${a.duracao_minutos || 0} min)</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

  const contentHtml = `
    <p>Olá, Criador da Egrégora Cosmo Alma TV,</p>
    <p>Uma nova trilha de capacitação acabou de ser publicada na <strong>Academia do Criador</strong> com novas diretrizes, materiais e recomendações para o seu canal:</p>
    
    <div style="background: linear-gradient(135deg, rgba(226,176,66,0.1) 0%, rgba(138,43,226,0.1) 100%); border: 1px solid #E2B042; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 5px;">${modulo.icone || "🎬"}</div>
      <h2 style="color: #FFFFFF; margin: 0 0 10px 0; font-size: 20px;">${modulo.titulo}</h2>
      <p style="color: #D1D5DB; margin: 0; font-size: 14px; line-height: 1.5;">${modulo.descricao || "Confira o conteúdo gravado e os materiais de apoio anexados."}</p>
      ${modulo.obrigatorio ? `
        <div style="margin-top: 12px;">
          <span style="background-color: #EF4444; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            ⚠️ Treinamento Obrigatório para Condôminos
          </span>
        </div>
      ` : ""}
    </div>

    ${lessonsListHtml}

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 0 15px rgba(226,176,66,0.4);">
        ▶ Acessar Academia & Iniciar Treinamento
      </a>
    </p>

    <p style="font-size: 13px; color: #9CA3AF;">
      Ao assistir às aulas, lembre-se de clicar em <strong>"Marcar como Concluída"</strong> para registrar sua assiduidade e conformidade com o canal.
    </p>
  `;

  return sendEmail({
    to: recipients,
    subject,
    html: getBaseTemplate("Nova Capacitação Disponível", contentHtml),
  });
}

/**
 * Notificação disparada quando um criador envia uma dúvida/comentário no fórum da aula:
 * 1. Envia alerta para os administradores responderem
 * 2. Envia confirmação de recebimento para o criador
 */
export async function sendDoubtSubmittedNotification({
  creatorName,
  creatorEmail,
  aulaTitulo,
  moduloTitulo,
  duvidaTexto
}: {
  creatorName: string;
  creatorEmail?: string;
  aulaTitulo: string;
  moduloTitulo?: string;
  duvidaTexto: string;
}) {
  // 1. Notificar Administradores
  const adminSubject = `💬 Nova Dúvida no Treinamento: ${creatorName} em "${aulaTitulo}"`;
  const adminContentHtml = `
    <p>Olá, Administrador da Cosmo Alma TV,</p>
    <p>O criador <strong>${creatorName}</strong> (${creatorEmail || "E-mail não informado"}) acabou de enviar uma nova dúvida no fórum da Academia de Treinamentos:</p>

    <div style="background-color: #111622; border-left: 4px solid #E2B042; border-radius: 6px; padding: 15px 20px; margin: 20px 0;">
      <div style="font-size: 12px; color: #E2B042; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">
        ${moduloTitulo ? `Trilha: ${moduloTitulo} | ` : ""}Aula: ${aulaTitulo}
      </div>
      <div style="color: #ECE8F5; font-size: 15px; line-height: 1.6; font-style: italic; white-space: pre-line;">
        "${duvidaTexto}"
      </div>
    </div>

    <p style="text-align: center; margin: 25px 0;">
      <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px; display: inline-block;">
        ▶ Acessar Fórum & Responder
      </a>
    </p>
  `;

  if (adminEmails && adminEmails.length > 0) {
    try {
      await sendEmail({
        to: adminEmails,
        subject: adminSubject,
        html: getBaseTemplate("Nova Dúvida de Criador", adminContentHtml)
      });
    } catch (err) {
      console.error("[SMTP] Erro ao notificar admins sobre dúvida:", err);
    }
  }

  // 2. Notificar o próprio Criador (Confirmação de Envio)
  if (creatorEmail && creatorEmail.includes("@")) {
    const creatorSubject = `✓ Dúvida Registrada: ${aulaTitulo} | Cosmo Alma TV`;
    const creatorContentHtml = `
      <p>Olá, <strong>${creatorName}</strong>,</p>
      <p>Sua dúvida sobre a aula <strong>"${aulaTitulo}"</strong> foi registrada com sucesso pela equipe de gestão da Cosmo Alma TV!</p>

      <div style="background-color: #111622; border: 1px solid #2D3142; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <div style="font-size: 12px; color: #E2B042; text-transform: uppercase; margin-bottom: 5px;">Sua Mensagem Enviada:</div>
        <div style="color: #ECE8F5; font-size: 14px; line-height: 1.5; font-style: italic; white-space: pre-line;">
          "${duvidaTexto}"
        </div>
      </div>

      <p style="color: #D1D5DB; font-size: 14px; line-height: 1.6;">
        Nossa equipe já foi notificada e responderá diretamente no fórum da aula. Assim que respondermos, você receberá um novo aviso com a resposta completa.
      </p>

      <p style="text-align: center; margin: 25px 0;">
        <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px; display: inline-block;">
          ▶ Acompanhar na Academia
        </a>
      </p>
    `;

    try {
      await sendEmail({
        to: creatorEmail,
        subject: creatorSubject,
        html: getBaseTemplate("Dúvida Registrada com Sucesso", creatorContentHtml)
      });
    } catch (err) {
      console.error("[SMTP] Erro ao enviar confirmação para o criador:", err);
    }
  }
}

/**
 * Notificação disparada quando um Administrador responde a uma dúvida no fórum:
 * Envia e-mail para o criador com a pergunta original e a resposta da administração
 */
export async function sendDoubtAnsweredNotification({
  creatorName,
  creatorEmail,
  aulaTitulo,
  moduloTitulo,
  duvidaTexto,
  respostaTexto,
  adminName
}: {
  creatorName: string;
  creatorEmail: string;
  aulaTitulo: string;
  moduloTitulo?: string;
  duvidaTexto?: string;
  respostaTexto: string;
  adminName?: string;
}) {
  if (!creatorEmail || !creatorEmail.includes("@")) {
    console.warn("[SMTP] E-mail do criador inválido. Notificação de resposta não enviada.");
    return null;
  }

  const subject = `✨ Sua Dúvida foi Respondida: "${aulaTitulo}" | Cosmo Alma TV`;

  const questionBlockHtml = duvidaTexto
    ? `
      <div style="background-color: #111622; border-left: 3px solid #718096; border-radius: 6px; padding: 12px 15px; margin: 15px 0;">
        <div style="font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Sua Pergunta:</div>
        <div style="color: #D1D5DB; font-size: 13px; line-height: 1.5; font-style: italic;">
          "${duvidaTexto}"
        </div>
      </div>
    `
    : "";

  const contentHtml = `
    <p>Olá, <strong>${creatorName}</strong>,</p>
    <p>A equipe de gestão da Cosmo Alma TV acabou de responder à sua dúvida na aula <strong>"${aulaTitulo}"</strong>:</p>

    ${questionBlockHtml}

    <div style="background: linear-gradient(135deg, rgba(226,176,66,0.15) 0%, rgba(138,43,226,0.15) 100%); border: 1px solid #E2B042; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <div style="font-size: 12px; color: #E2B042; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">
        💬 Resposta da Administração (${adminName || "Equipe Cosmo Alma TV"}):
      </div>
      <div style="color: #FFFFFF; font-size: 15px; line-height: 1.6; white-space: pre-line;">
        ${respostaTexto}
      </div>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 0 15px rgba(226,176,66,0.4);">
        ▶ Acessar Academia & Ver no Fórum
      </a>
    </p>

    <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
      Se ainda tiver alguma dúvida adicional, você pode continuar a conversa respondendo diretamente no fórum da aula.
    </p>
  `;

  return sendEmail({
    to: creatorEmail,
    subject,
    html: getBaseTemplate("Resposta da Administração", contentHtml)
  });
}

/**
 * Notificação disparada automaticamente UMA ÚNICA VEZ quando o criador tem seu primeiro pagamento
 * compensado e se torna ATIVO_ADIMPLENTE.
 */
export async function sendCreatorWelcomeAndTrainingNotification({
  creator,
  mandatoryModules = []
}: {
  creator: any;
  mandatoryModules?: any[];
}) {
  const creatorEmail = creator.email?.trim();
  if (!creatorEmail || !creatorEmail.includes("@")) {
    console.warn("[SMTP] E-mail do criador inválido. Boas-vindas não enviadas.");
    return null;
  }

  const creatorName = creator.nome_comercial || creator.nome_completo || "Criador";
  const subject = `🌟 Bem-vindo(a) à Cosmo Alma TV! Inicie seu Treinamento Obrigatório`;

  const modulesHtml = mandatoryModules.length > 0
    ? `
      <div style="margin: 20px 0; background-color: #111622; border-radius: 8px; padding: 15px; border: 1px solid #2D3142;">
        <h4 style="color: #E2B042; margin-top: 0; margin-bottom: 10px; font-size: 13px; text-transform: uppercase;">Trilhas Obrigatórias de Onboarding:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #ECE8F5; font-size: 14px;">
          ${mandatoryModules.map((m) => `
            <li style="margin-bottom: 8px;">
              <strong>${m.icone || "📜"} ${m.titulo}</strong>
              ${m.descricao ? `<div style="font-size: 12px; color: #9CA3AF; margin-top: 2px;">${m.descricao}</div>` : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

  const contentHtml = `
    <p>Olá, <strong>${creatorName}</strong>,</p>
    <p>É uma alegria imensa dar as boas-vindas oficiais a você na <strong>Egrégora Cosmo Alma TV</strong>!</p>
    
    <div style="background: linear-gradient(135deg, rgba(56,161,105,0.15) 0%, rgba(226,176,66,0.15) 100%); border: 1px solid #38A169; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <div style="color: #38A169; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 5px;">
        ✓ Adesão & Pagamento Confirmados
      </div>
      <div style="color: #FFFFFF; font-size: 15px; line-height: 1.6;">
        Seu contrato e a primeira cota condominial foram processados com sucesso. Seu canal está agora no status <strong>ATIVO ADIMPLENTE</strong>.
      </div>
    </div>

    <h3 style="color: #E2B042; font-size: 16px; margin-top: 25px; margin-bottom: 10px;">
      🚀 Próximo Passo Obrigatório: Capacitação & Alinhamento
    </h3>
    <p style="color: #D1D5DB; font-size: 14px; line-height: 1.6;">
      Para garantir a conformidade técnica, o padrão editorial cósmico e a sua elegibilidade no rateio 70/30, você deve assistir às aulas obrigatórias na nossa <strong>Academia do Criador</strong>:
    </p>

    ${modulesHtml}

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 14px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 0 20px rgba(226,176,66,0.4);">
        ▶ Acessar Academia & Iniciar Treinamentos
      </a>
    </p>

    <div style="background-color: #111622; border-left: 3px solid #E2B042; border-radius: 6px; padding: 12px 15px; margin: 20px 0;">
      <div style="font-size: 12px; color: #E2B042; font-weight: bold; margin-bottom: 3px;">📌 Lembrete Importante:</div>
      <div style="font-size: 13px; color: #D1D5DB; line-height: 1.5;">
        Conforme Cláusula Contratual, mantenha a frequência de 1 a 3 envios semanais e marque cada aula como <em>"Concluída"</em> no portal para validar sua assiduidade.
      </div>
    </div>

    <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
      Se tiver qualquer dúvida durante as aulas, utilize o fórum integrado na própria plataforma para falar com a equipe de gestão.
    </p>
  `;

  return sendEmail({
    to: creatorEmail,
    subject,
    html: getBaseTemplate("Boas-Vindas à Cosmo Alma TV", contentHtml)
  });
}

/**
 * Notificação disparada individualmente pelo Administrador cobrando a conclusão
 * dos treinamentos pendentes de um criador específico.
 */
export async function sendIndividualTrainingReminderNotification({
  creator,
  pendingModules = [],
  adminName
}: {
  creator: any;
  pendingModules?: any[];
  adminName?: string;
}) {
  const creatorEmail = creator.email?.trim();
  if (!creatorEmail || !creatorEmail.includes("@")) {
    console.warn("[SMTP] E-mail do criador inválido. Lembrete não enviado.");
    return null;
  }

  const creatorName = creator.nome_comercial || creator.nome_completo || "Criador";
  const subject = `🔔 Lembrete de Treinamento Obrigatório: ${creatorName} | Cosmo Alma TV`;

  const pendingHtml = pendingModules.length > 0
    ? `
      <div style="margin: 20px 0; background-color: #111622; border-radius: 8px; padding: 15px; border: 1px solid #2D3142;">
        <h4 style="color: #E2B042; margin-top: 0; margin-bottom: 10px; font-size: 13px; text-transform: uppercase;">Módulos Obrigatórios Pendentes:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #ECE8F5; font-size: 14px;">
          ${pendingModules.map((m) => `
            <li style="margin-bottom: 8px;">
              <strong>${m.icone || "📜"} ${m.titulo}</strong>
              ${m.descricao ? `<div style="font-size: 12px; color: #9CA3AF; margin-top: 2px;">${m.descricao}</div>` : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

  const contentHtml = `
    <p>Olá, <strong>${creatorName}</strong>,</p>
    <p>Este é um lembrete da equipe de gestão da <strong>Cosmo Alma TV</strong> referente à sua capacitação na Academia do Criador.</p>

    <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(226,176,66,0.1) 100%); border: 1px solid #EF4444; border-radius: 10px; padding: 18px; margin: 20px 0;">
      <div style="color: #EF4444; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">
        ⚠️ Treinamento Obrigatório Pendente de Conclusão
      </div>
      <div style="color: #ECE8F5; font-size: 14px; line-height: 1.6;">
        Identificamos que você ainda possui trilhas de capacitação obrigatórias não finalizadas no portal. A conformidade com os procedimentos e diretrizes técnicas é indispensável para a sua regularidade operacional.
      </div>
    </div>

    ${pendingHtml}

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://portal.cosmoalmatv.com.br/treinamentos" style="background-color: #E2B042; color: #0B0E14; padding: 14px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 0 20px rgba(226,176,66,0.4);">
        ▶ Acessar Academia & Concluir Aulas
      </a>
    </p>

    <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
      Ao finalizar cada vídeo, lembre-se de clicar em <strong>"Marcar como Concluída"</strong> para atualizar seu índice de conformidade na plataforma.
      ${adminName ? `<br><span style="color: #D1D5DB;">Solicitado por: ${adminName}</span>` : ""}
    </p>
  `;

  return sendEmail({
    to: creatorEmail,
    subject,
    html: getBaseTemplate("Lembrete de Capacitação", contentHtml)
  });
}


