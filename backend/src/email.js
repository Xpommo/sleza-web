/**
 * Email delivery via Resend.com
 * Set RESEND_API_KEY in Railway Variables to enable.
 * Without the key, functions are no-ops (safe for local dev).
 */
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = 'Sleza Scanner <noreply@sleza.media>';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn('[email] RESEND_API_KEY not set — email sending disabled');
}

export async function sendReminderEmail(email, hostname, scanUuid) {
  if (!resend) return;
  const scanUrl = `https://sleza-web.vercel.app/?report=${scanUuid}`;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `Пора перепроверить ${hostname}`,
    html: `
      <div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Напоминание о проверке</h2>
        <p style="color:#666;margin-bottom:16px">
          Прошло 2 месяца с момента последней проверки сайта <strong>${hostname}</strong>.
          Законодательство меняется — время проверить снова.
        </p>
        <p style="margin-bottom:24px">
          <a href="https://sleza-web.vercel.app/?url=${encodeURIComponent('https://' + hostname)}"
             style="background:#1f1fe6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
            Проверить сайт →
          </a>
        </p>
        ${scanUuid ? `<p style="font-size:12px;color:#999">Предыдущий отчёт: <a href="${scanUrl}">${scanUrl}</a></p>` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:11px;color:#bbb">
          Вы получили это письмо потому что подписались на напоминания на sleza-web.vercel.app.
          Это бесплатный сервис. Отписаться — просто ответьте на это письмо.
        </p>
      </div>
    `,
  });
}
