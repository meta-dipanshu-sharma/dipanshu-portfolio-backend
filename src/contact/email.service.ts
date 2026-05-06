import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface ContactEmailPayload {
  id: string;
  name: string;
  email: string;
  company?: string;
  subject?: string;
  message: string;
  receivedAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendContactNotification(payload: ContactEmailPayload): Promise<boolean> {
    const toEmail = this.config.get<string>('CONTACT_EMAIL') || 'dipanshusharma2510@gmail.com';
    const fromEmail = this.config.get<string>('FROM_EMAIL') || 'portfolio@dipanshudev.com';

    try {
      const { error } = await this.resend.emails.send({
        from: fromEmail,
        to: toEmail,
        reply_to: payload.email,
        subject: `Portfolio contact: ${payload.subject || `Message from ${payload.name}`}`,
        html: this.buildEmailHtml(payload),
        text: this.buildEmailText(payload),
      });

      if (error) {
        this.logger.error(`Resend error: ${JSON.stringify(error)}`);
        return false;
      }

      this.logger.log(`Contact email sent for message ${payload.id} from ${payload.email}`);
      return true;
    } catch (err) {
      this.logger.error(`Email send failed: ${err.message}`);
      return false;
    }
  }

  // Send confirmation to the person who filled the form
  async sendContactConfirmation(payload: ContactEmailPayload): Promise<void> {
    const fromEmail = this.config.get<string>('FROM_EMAIL') || 'portfolio@dipanshudev.com';

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: payload.email,
        subject: `Got your message, ${payload.name.split(' ')[0]}!`,
        html: this.buildConfirmationHtml(payload),
      });
    } catch (err) {
      // Non-critical — log and continue
      this.logger.warn(`Confirmation email failed for ${payload.email}: ${err.message}`);
    }
  }

  private buildEmailHtml(p: ContactEmailPayload): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e8e6e1; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #0e0e10; border: 1px solid #2a2a2e; border-radius: 16px; overflow: hidden; }
    .header { background: #0a0a0b; padding: 24px 32px; border-bottom: 1px solid #2a2a2e; }
    .header h1 { margin: 0; font-size: 18px; color: #d4ff4a; font-weight: 500; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #666; font-family: monospace; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .label { font-size: 11px; color: #666; font-family: monospace; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
    .value { font-size: 15px; color: #e8e6e1; line-height: 1.5; }
    .message-box { background: #131316; border: 1px solid #2a2a2e; border-radius: 10px; padding: 16px 20px; margin-top: 6px; }
    .footer { padding: 16px 32px; border-top: 1px solid #2a2a2e; font-size: 11px; color: #444; font-family: monospace; }
    .badge { display: inline-block; background: rgba(212,255,74,0.1); color: #d4ff4a; border: 1px solid rgba(212,255,74,0.3); border-radius: 999px; padding: 2px 10px; font-size: 11px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>New portfolio contact</h1>
      <p>ID: ${p.id} · ${p.receivedAt.toISOString()}</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">From</div>
        <div class="value"><strong>${p.name}</strong> ${p.company ? `· <span style="color:#888">${p.company}</span>` : ''}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${p.email}" style="color:#d4ff4a">${p.email}</a></div>
      </div>
      ${p.subject ? `
      <div class="field">
        <div class="label">Subject</div>
        <div class="value">${p.subject}</div>
      </div>` : ''}
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box value">${p.message.replace(/\n/g, '<br>')}</div>
      </div>
      <div style="margin-top: 24px">
        <a href="mailto:${p.email}?subject=Re: ${encodeURIComponent(p.subject || 'Your message')}"
           style="display:inline-block; background:#d4ff4a; color:#0a0a0b; padding:10px 20px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:500;">
          Reply to ${p.name.split(' ')[0]}
        </a>
      </div>
    </div>
    <div class="footer">
      Sent from portfolio backend · Reply-To is set to sender's email
    </div>
  </div>
</body>
</html>`;
  }

  private buildEmailText(p: ContactEmailPayload): string {
    return [
      `New portfolio contact — ${p.receivedAt.toISOString()}`,
      `ID: ${p.id}`,
      '',
      `Name: ${p.name}${p.company ? ` (${p.company})` : ''}`,
      `Email: ${p.email}`,
      p.subject ? `Subject: ${p.subject}` : '',
      '',
      'Message:',
      p.message,
    ].filter(Boolean).join('\n');
  }

  private buildConfirmationHtml(p: ContactEmailPayload): string {
    const firstName = p.name.split(' ')[0];
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f3ee; color: #1a1a1d; margin: 0; padding: 0; }
    .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border: 1px solid #e0ddd8; border-radius: 16px; overflow: hidden; }
    .header { background: #0a0a0b; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; color: #d4ff4a; font-weight: 500; }
    .body { padding: 32px; font-size: 15px; line-height: 1.65; color: #333; }
    .footer { padding: 16px 32px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Ds · Dipanshu Sharma</h1></div>
    <div class="body">
      <p>Hi ${firstName},</p>
      <p>Thanks for reaching out — I got your message and will get back to you within 24 hours on weekdays.</p>
      <p>In the meantime, feel free to check out my work on <a href="https://github.com/meta-dipanshu-sharma" style="color:#0a0a0b">GitHub</a> or connect on <a href="https://linkedin.com/in/sharma-dipanshu" style="color:#0a0a0b">LinkedIn</a>.</p>
      <p style="margin-top:24px; color:#888; font-size:13px;">— Dipanshu</p>
    </div>
    <div class="footer">This is an automated confirmation. Reply to this email if you need to follow up.</div>
  </div>
</body>
</html>`;
  }
}
