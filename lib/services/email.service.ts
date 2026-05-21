import nodemailer from 'nodemailer';

export class EmailService {
  static async sendMagicLink(email: string, token: string, attemptId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approveUrl = `${baseUrl}/mfa/approve?token=${encodeURIComponent(token)}&attemptId=${encodeURIComponent(attemptId)}`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'AIBID <no-reply@aibid.local>';

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('Email delivery is not configured.');
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve your login</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .card { max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .header { background: #111827; padding: 28px 20px; text-align: center; color: #fff; }
    .logo { display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #374151; font-weight: 700; margin-bottom: 8px; }
    .content { padding: 28px 20px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; background: #111827; color: #fff !important; text-decoration: none; font-weight: 600; }
    .meta { color: #6b7280; font-size: 13px; margin-top: 18px; line-height: 1.5; }
    .footer { font-size: 12px; color: #9ca3af; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">AI</div>
      <div style="font-weight:700;">AIBID</div>
    </div>
    <div class="content">
      <h2 style="margin: 0 0 10px 0;">Login attempt detected</h2>
      <p style="margin: 0 0 20px 0; color:#000000;">To finish sign in, approve this request in the next 15 minutes.</p>
      <a href="${approveUrl}" class="btn">Approve Login</a>
      <p class="meta">If this was not you, ignore this message. This link is single-use and expires automatically.</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} AIBID CRM Platform</div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'AIBID-Approve your login',
      html,
    });
  }
}
