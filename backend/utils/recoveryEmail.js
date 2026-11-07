// SMTP settings belong to this MERN app; credentials are never copied from SWP.
exports.configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
exports.send = async (email, otp) => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM, to: email,
    subject: 'Aura Café — Mã khôi phục mật khẩu',
    text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`
  });
};
