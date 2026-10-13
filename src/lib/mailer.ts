import nodemailer from 'nodemailer';

const ADMIN_NOTIFICATION_EMAIL = 'tidlambsport@gmail.com';

function getTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
}

export async function sendPasswordNotification(userEmail: string, userName: string, isNewAccount: boolean) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[Mailer] SMTP não configurado. Defina SMTP_USER e SMTP_PASS nas variáveis de ambiente.");
      return;
    }

    const sender = process.env.SMTP_USER || process.env.EMAIL_USER;
    const subject = isNewAccount 
      ? `Nova Conta Criada - SYNGETI LOG`
      : `Senha Alterada - SYNGETI LOG`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1B3049; border-radius: 10px; background-color: #050D1B; color: #F3F7FC;">
        <h2 style="color: #00C2FF;">${isNewAccount ? 'Bem-vindo ao SYNGETI LOG' : 'Aviso de Segurança - SYNGETI LOG'}</h2>
        <p>Olá,</p>
        <p>Este é um aviso de que ${isNewAccount ? 'uma nova conta foi criada e uma senha provisória foi gerada' : 'a senha de acesso foi alterada'} para o usuário abaixo:</p>
        
        <div style="background-color: #0B1B30; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #1B3049;">
          <p style="margin: 5px 0;"><strong>Nome:</strong> ${userName}</p>
          <p style="margin: 5px 0;"><strong>E-mail/Login:</strong> ${userEmail}</p>
        </div>
        
        <p style="color: #9BB0C8; font-size: 13px;">Para visualizar e acessar a senha, ou fazer login, acesse a plataforma.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SYNGETI LOG" <${sender}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject,
      html,
    });
    console.log(`[Mailer] Notificação enviada para ${ADMIN_NOTIFICATION_EMAIL}`);
  } catch (error) {
    console.error("[Mailer] Erro ao enviar notificação de conta:", error);
  }
}

export async function sendPasswordResetAdminNotification(data: {
  protocol: string;
  userName: string;
  username: string;
  userEmail: string;
  requestDate: string;
  adminUrl: string;
}) {
  try {
    const transporter = getTransporter();
    const sender = process.env.SMTP_USER || process.env.EMAIL_USER;

    const subject = `SYNGETI LOG — Solicitação de recuperação de senha [${data.protocol}]`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #1B3049; border-radius: 12px; background-color: #050D1B; color: #F3F7FC;">
        <div style="border-bottom: 1px solid #1B3049; padding-bottom: 14px; margin-bottom: 18px;">
          <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px;">SYNGE<span style="color: #00C2FF;">TI</span></span>
          <span style="display: block; font-size: 11px; color: #9BB0C8; letter-spacing: 1px; margin-top: 2px;">GESTÃO DE TI & SEGURANÇA OPERACIONAL</span>
        </div>

        <h3 style="color: #00C2FF; margin-top: 0;">Solicitação de Recuperação de Senha</h3>
        <p style="font-size: 14px; color: #F3F7FC; line-height: 1.5;">
          Um usuário solicitou a recuperação de acesso ao <strong>SYNGETI LOG</strong>.
        </p>

        <div style="background-color: #0B1B30; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #1B3049;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #F3F7FC;">
            <tr>
              <td style="padding: 6px 0; color: #9BB0C8; width: 140px;"><strong>Nome do usuário:</strong></td>
              <td style="padding: 6px 0; font-weight: 600;">${data.userName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9BB0C8;"><strong>Login informado:</strong></td>
              <td style="padding: 6px 0; font-weight: 600;">${data.username}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9BB0C8;"><strong>E-mail cadastrado:</strong></td>
              <td style="padding: 6px 0;">${data.userEmail || 'Não informado'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9BB0C8;"><strong>Data da solicitação:</strong></td>
              <td style="padding: 6px 0;">${data.requestDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9BB0C8;"><strong>Protocolo:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; color: #00D5F2; font-weight: 700;">${data.protocol}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #9BB0C8; line-height: 1.5;">
          Acesse o painel administrativo do <strong>SYNGETI LOG</strong> para verificar a solicitação e realizar o atendimento, conforme as permissões disponíveis.
        </p>

        <div style="margin: 26px 0 10px 0;">
          <a href="${data.adminUrl}" style="background-color: #1765F5; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Atender Solicitação no Painel &rarr;
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1B3049; font-size: 11px; color: #64748B;">
          Mensagem automática de segurança gerada pelo sistema SYNGETI LOG. Destinatário autorizado: ${ADMIN_NOTIFICATION_EMAIL}.
        </div>
      </div>
    `;

    if (!transporter || !sender) {
      console.warn(`[Mailer] SMTP não configurado. Notificação registrada localmente para ${ADMIN_NOTIFICATION_EMAIL}. Protocolo: ${data.protocol}`);
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const info = await transporter.sendMail({
      from: `"SYNGETI LOG" <${sender}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject,
      html,
    });

    console.log(`[Mailer] E-mail enviado com sucesso para ${ADMIN_NOTIFICATION_EMAIL}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Mailer] Falha ao enviar e-mail de recuperação de senha:", error?.message || error);
    return { success: false, error: error?.message };
  }
}

export async function sendPasswordResetUserToken(data: {
  userEmail: string;
  userName: string;
  resetUrl: string;
  protocol: string;
  expiresInMinutes: number;
}) {
  try {
    const transporter = getTransporter();
    const sender = process.env.SMTP_USER || process.env.EMAIL_USER;

    const subject = `SYNGETI LOG — Redefinição de Senha de Acesso`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #1B3049; border-radius: 12px; background-color: #050D1B; color: #F3F7FC;">
        <h2 style="color: #00C2FF; margin-top: 0;">Redefinição de Senha</h2>
        <p>Olá, <strong>${data.userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5;">
          Um procedimento seguro de redefinição de senha foi autorizado para sua conta no <strong>SYNGETI LOG</strong> referente ao protocolo <code>${data.protocol}</code>.
        </p>

        <div style="margin: 25px 0;">
          <a href="${data.resetUrl}" style="background-color: #1765F5; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Criar Nova Senha
          </a>
        </div>

        <p style="font-size: 12px; color: #9BB0C8;">
          Este link é de uso único e expira em <strong>${data.expiresInMinutes} minutos</strong>. Se você não solicitou este procedimento, ignore esta mensagem e informe a equipe de TI imediatamente.
        </p>
      </div>
    `;

    if (!transporter || !sender) {
      console.warn(`[Mailer] SMTP não configurado para envio ao usuário ${data.userEmail}`);
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const info = await transporter.sendMail({
      from: `"SYNGETI LOG" <${sender}>`,
      to: data.userEmail,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Mailer] Erro ao enviar token para usuário:", error?.message || error);
    return { success: false, error: error?.message };
  }
}
