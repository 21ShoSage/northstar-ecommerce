import nodemailer from 'nodemailer';

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });
}

export async function sendOrderNotification({ email, orderId, status, total }) {
  if (!configured()) {
    console.warn('Order email notification skipped: SMTP is not configured.');
    return;
  }

  await transport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Northstar order #${orderId} - ${status}`,
    text: `Your Northstar order #${orderId} is now ${status}. Order total: PHP ${Number(total).toFixed(2)}.`
  });
}
