const nodemailer = require('nodemailer');

const configured =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

let transporter = null;

if (configured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendPasswordResetCode(to, code, name) {
  const from = process.env.SMTP_FROM || 'Saber Delta <no-reply@saberdelta.com>';

  if (!transporter) {
    console.log(`[mailer] SMTP não configurado — código de redefinição para ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Redefinição de senha — Saber Delta',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <h2 style="margin: 0 0 16px;">Redefinição de senha</h2>
        <p>Olá, ${name || 'usuário'}!</p>
        <p>Recebemos uma solicitação para redefinir a sua senha. Use o código abaixo:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #a5b4fc;">${code}</p>
        <p style="font-size: 13px; color: #94a3b8;">O código expira em 15 minutos. Se você não solicitou esta redefinição, ignore este email.</p>
      </div>
    `
  });
}

module.exports = { sendPasswordResetCode };
