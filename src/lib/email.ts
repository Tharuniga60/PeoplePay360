/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Handles single & bulk payslip email distribution with PDF attachments.
 * If BREVO_API_KEY is not configured, provides graceful audit simulation.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  content: string; // Base64 string
  name: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  attachments?: EmailAttachment[];
}

export interface EmailDispatchResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  recipientCount: number;
}

/**
 * Dispatch an email via Brevo REST API v3
 */
export async function sendEmailWithBrevo(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'payroll@peoplepay360.com';
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'PeoplePay360 Payroll';

  // If no API key is provided, log simulation and return graceful success
  if (!apiKey) {
    console.info('[BREVO SIMULATION] BREVO_API_KEY not configured. Simulated dispatch for:', {
      to: options.to.map((r) => r.email),
      subject: options.subject,
      attachmentCount: options.attachments?.length ?? 0,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipientCount: options.to.length,
    };
  }

  try {
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: options.to.map((r) => ({ email: r.email, name: r.name || r.email })),
      subject: options.subject,
      htmlContent: options.htmlContent,
      ...(options.attachments && options.attachments.length > 0 && {
        attachment: options.attachments.map((a) => ({
          content: a.content,
          name: a.name,
        })),
      }),
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[BREVO ERROR]', data);
      return {
        success: false,
        simulated: false,
        error: data.message || 'Brevo API error',
        recipientCount: options.to.length,
      };
    }

    return {
      success: true,
      simulated: false,
      messageId: data.messageId,
      recipientCount: options.to.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error connecting to Brevo';
    console.error('[BREVO EXCEPTION]', msg);
    return {
      success: false,
      simulated: false,
      error: msg,
      recipientCount: options.to.length,
    };
  }
}

/**
 * Format and send a single employee payslip email
 */
export async function sendPayslipEmail({
  toEmail,
  employeeName,
  period,
  payrunName,
  gross,
  net,
  pdfBase64,
}: {
  toEmail: string;
  employeeName: string;
  period: string;
  payrunName: string;
  gross: number;
  net: number;
  pdfBase64?: string;
}): Promise<EmailDispatchResult> {
  const formattedGross = `₹${gross.toLocaleString('en-IN')}`;
  const formattedNet = `₹${net.toLocaleString('en-IN')}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1117; color: #e2e8f0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #1a1d27; border: 1px solid #2a2d3e; border-radius: 12px; padding: 32px; }
    .header { border-bottom: 1px solid #2a2d3e; padding-bottom: 16px; margin-bottom: 24px; }
    .title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .subtitle { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; background-color: rgba(59,110,240,0.15); color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .metrics { display: flex; margin: 24px 0; background-color: #111319; border: 1px solid #2a2d3e; border-radius: 8px; }
    .metric-col { flex: 1; padding: 16px; text-align: center; border-right: 1px solid #2a2d3e; }
    .metric-col:last-child { border-right: none; }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .metric-value { font-size: 18px; font-weight: 700; color: #ffffff; }
    .metric-value.net { color: #34d399; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #2a2d3e; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">PeoplePay360 — Payslip Delivery</h1>
      <p class="subtitle">Pay Period: ${period} (${payrunName})</p>
      <span class="badge">CONFIDENTIAL PAYSLIP</span>
    </div>

    <p>Dear <strong>${employeeName}</strong>,</p>
    <p>Your payslip for <strong>${period}</strong> has been finalized and processed. Please find a summary of your earnings below:</p>

    <div class="metrics">
      <div class="metric-col">
        <div class="metric-label">Gross Earnings</div>
        <div class="metric-value">${formattedGross}</div>
      </div>
      <div class="metric-col">
        <div class="metric-label">Take-Home (Net Pay)</div>
        <div class="metric-value net">${formattedNet}</div>
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      ${pdfBase64 ? 'A detailed PDF copy of your payslip is attached to this email.' : 'You can log in to your PeoplePay360 employee portal to view and download your full salary computation trace.'}
    </p>

    <div class="footer">
      PeoplePay360 Integrated HR & Payroll Operations • Automated confidential delivery.
    </div>
  </div>
</body>
</html>
  `.trim();

  const attachments: EmailAttachment[] = pdfBase64
    ? [
        {
          name: `Payslip_${employeeName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`,
          content: pdfBase64,
        },
      ]
    : [];

  return sendEmailWithBrevo({
    to: [{ email: toEmail, name: employeeName }],
    subject: `Payslip for ${period} — PeoplePay360`,
    htmlContent,
    attachments,
  });
}
