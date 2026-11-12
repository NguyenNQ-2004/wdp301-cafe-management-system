// SMTP settings belong to this MERN app; credentials are never copied from SWP.
const senderEmail = () => process.env.SMTP_FROM || process.env.AURA_SMTP_EMAIL || '';
const smtpPassword = () => process.env.SMTP_PASS || process.env.AURA_SMTP_PASSWORD || '';
const smtpHost = () => process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = () => Number(process.env.SMTP_PORT || 587);

// Support both this MERN app's SMTP_* names and the existing SWP391 names.
// Credentials stay in environment variables; no password is stored in source code.
exports.configured = () => !!(senderEmail() && smtpPassword());
exports.send = async (email, otp) => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: smtpHost(),
    port: smtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER || senderEmail(), pass: smtpPassword() },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  await transport.sendMail({
    from: senderEmail(), to: email,
    subject: 'Aura Café — Mã khôi phục mật khẩu',
    text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`
  });
};
