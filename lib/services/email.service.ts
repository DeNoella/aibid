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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve your login</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 24px;
      background-color: #0d1117;
      color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 16px;
      overflow: hidden;
    }
    .header {
      padding: 28px 24px 20px;
      text-align: center;
      border-bottom: 1px solid #30363d;
      background: #0d1117;
    }
    .logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.04em;
      margin: 0 0 6px 0;
    }
    .tagline {
      margin: 0;
      color: #8b949e;
      font-size: 13px;
    }
    .content {
      padding: 28px 24px;
      text-align: center;
    }
    .title {
      margin: 0 0 10px 0;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }
    .text {
      margin: 0 0 24px 0;
      color: #8b949e;
      font-size: 15px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      border-radius: 10px;
      background: #f0883e;
      color: #0d1117 !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
    }
    .meta {
      color: #8b949e;
      font-size: 13px;
      margin-top: 20px;
      line-height: 1.6;
    }
    .footer {
      font-size: 12px;
      color: #8b949e;
      padding: 16px 24px;
      text-align: center;
      border-top: 1px solid #30363d;
      background: #0d1117;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <p class="logo">AIBID</p>
      <p class="tagline">Analytics Platform</p>
    </div>
    <div class="content">
      <h2 class="title">Login attempt detected</h2>
      <p class="text">To finish signing in, approve this request within the next 15 minutes.</p>
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
      subject: 'AIBID — Approve your login',
      html,
    });
  }

  /**
   * Direct user-to-user message. Renders the sender's name prominently
   * and the message body verbatim, with a link back to the inbox.
   * Best-effort: silently no-ops when SMTP is not configured.
   */
  static async sendUserMessage(
    email: string,
    data: { fromName: string; subject: string; body: string; linkUrl?: string }
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'AIBID <no-reply@aibid.local>';
    if (!smtpHost || !smtpUser || !smtpPass) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inboxUrl = data.linkUrl ? (data.linkUrl.startsWith('http') ? data.linkUrl : `${baseUrl}${data.linkUrl}`) : `${baseUrl}/notifications`;
    const escapedBody = data.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${data.subject}</title>
  <style>
    body { margin:0; padding:24px; background:#0d1117; color:#fff; font-family:'Inter',-apple-system,Arial,sans-serif; }
    .card { max-width:560px; margin:0 auto; background:#161b22; border:1px solid #30363d; border-radius:14px; overflow:hidden; }
    .header { padding:20px 24px; border-bottom:1px solid #30363d; }
    .badge { display:inline-block; padding:4px 10px; background:#3b82f622; color:#3b82f6; border-radius:999px; font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; }
    .body { padding:20px 24px; }
    .from { color:#8b949e; font-size:13px; margin: 0 0 12px 0; }
    .from .name { color:#fff; font-weight:600; }
    .subject { font-size:18px; font-weight:600; margin:0 0 16px 0; }
    .message { color:#c9d1d9; font-size:14px; line-height:1.6; white-space:pre-wrap; padding:14px 16px; background:#0d1117; border-left:3px solid #3b82f6; border-radius:6px; }
    .btn { display:inline-block; margin-top:20px; padding:10px 18px; background:#f0883e; color:#0d1117 !important; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .footer { padding:14px 24px; border-top:1px solid #30363d; color:#8b949e; font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><span class="badge">New message</span></div>
    <div class="body">
      <p class="from">You have a new message from <span class="name">${data.fromName}</span></p>
      <p class="subject">${data.subject}</p>
      <div class="message">${escapedBody}</div>
      <a class="btn" href="${inboxUrl}">Open in AIBID</a>
    </div>
    <div class="footer">You are receiving this because someone sent you a direct message inside AIBID.</div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `${data.fromName} sent you a message — ${data.subject}`,
      html,
    });
  }

  /**
   * Send an admin alert email about a user action (e.g. data upload,
   * report download, account created). Best-effort: silently no-ops when
   * SMTP is not configured.
   */
  static async sendAdminAlert(
    email: string,
    data: { title: string; message: string; actorName?: string; actionLabel?: string; linkUrl?: string }
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'AIBID <no-reply@aibid.local>';
    if (!smtpHost || !smtpUser || !smtpPass) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = data.linkUrl ? (data.linkUrl.startsWith('http') ? data.linkUrl : `${baseUrl}${data.linkUrl}`) : `${baseUrl}/notifications`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  <style>
    body { margin: 0; padding: 24px; background:#0d1117; color:#fff; font-family: 'Inter', -apple-system, Arial, sans-serif; }
    .card { max-width: 560px; margin: 0 auto; background:#161b22; border:1px solid #30363d; border-radius:14px; overflow:hidden; }
    .header { padding: 20px 24px; border-bottom: 1px solid #30363d; }
    .badge { display:inline-block; padding:4px 10px; background:#f0883e22; color:#f0883e; border-radius:999px; font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; }
    .body { padding: 20px 24px; }
    .title { font-size: 18px; font-weight:600; margin: 6px 0 12px 0; }
    .meta { color:#8b949e; font-size: 13px; line-height: 1.6; margin: 0; }
    .actor { color:#fff; font-weight: 500; }
    .btn { display:inline-block; margin-top: 18px; padding: 10px 18px; background:#f0883e; color:#0d1117 !important; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
    .footer { padding: 14px 24px; border-top:1px solid #30363d; color:#8b949e; font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">${data.actionLabel || 'Admin alert'}</span>
    </div>
    <div class="body">
      <p class="title">${data.title}</p>
      <p class="meta">${data.actorName ? `<span class="actor">${data.actorName}</span> — ` : ''}${data.message}</p>
      <a class="btn" href="${link}">Open in AIBID</a>
    </div>
    <div class="footer">You are receiving this because you are a system administrator on AIBID.</div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `AIBID — ${data.title}`,
      html,
    });
  }

  static async sendWelcomeEmail(email: string, name: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/login`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'AIBID <no-reply@aibid.local>';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AIBID</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 24px; background-color: #0d1117; color: #ffffff; font-family: 'Inter', Arial, sans-serif; }
    .card { max-width: 520px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; }
    .header { padding: 28px 24px 20px; text-align: center; border-bottom: 1px solid #30363d; background: #0d1117; }
    .logo { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; margin: 0 0 6px 0; }
    .tagline { margin: 0; color: #8b949e; font-size: 13px; }
    .content { padding: 28px 24px; text-align: center; }
    .title { margin: 0 0 10px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; }
    .text { margin: 0 0 24px 0; color: #8b949e; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 28px; border-radius: 10px; background: #f0883e; color: #0d1117 !important; text-decoration: none; font-weight: 600; font-size: 15px; }
    .footer { font-size: 12px; color: #8b949e; padding: 16px 24px; text-align: center; border-top: 1px solid #30363d; background: #0d1117; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <p class="logo">AIBID</p>
      <p class="tagline">Analytics Platform</p>
    </div>
    <div class="content">
      <h2 class="title">Welcome, ${name}!</h2>
      <p class="text">Your AIBID account has been created successfully. When you sign in, you will be guided to choose a profile picture or use a generated AIBID avatar before entering the dashboard.</p>
      <a href="${loginUrl}" class="btn">Sign In to AIBID</a>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} AIBID CRM Platform</div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'AIBID — Welcome to your new account',
      html,
    });
  }
}
