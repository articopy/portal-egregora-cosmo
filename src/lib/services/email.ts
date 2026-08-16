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
