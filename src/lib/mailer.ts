import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordNotification(userEmail: string, userName: string, isNewAccount: boolean) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Nodemailer não configurado. Defina SMTP_USER e SMTP_PASS no .env");
    return;
  }

  const subject = isNewAccount 
    ? `Nova Conta Criada - SYNGETI`
    : `Senha Alterada - SYNGETI`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #007BFF;">${isNewAccount ? 'Bem-vindo ao SYNGETI' : 'Aviso de Segurança - SYNGETI'}</h2>
      <p>Olá,</p>
      <p>Este é um aviso de que ${isNewAccount ? 'uma nova conta foi criada e uma senha provisória foi gerada' : 'a senha de acesso foi alterada'} para o usuário abaixo:</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Nome:</strong> ${userName}</p>
        <p><strong>E-mail/Login:</strong> ${userEmail}</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">Para visualizar e acessar a senha, ou fazer login, entre na plataforma.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SYNGETI" <${process.env.SMTP_USER}>`,
      to: 'tidlambsport@gmail.com', // E-mail fixo solicitado pelo usuário
      subject,
      html,
    });
    console.log("E-mail de notificação de senha enviado com sucesso para tidlambsport@gmail.com");
  } catch (error) {
    console.error("Erro ao enviar e-mail de notificação de senha:", error);
  }
}
