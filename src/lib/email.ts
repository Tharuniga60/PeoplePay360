/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Handles single & bulk payslip email distribution with PDF attachments.
 * If BREVO_API_KEY is not configured or uses placeholder values, provides graceful audit simulation.
 * Fully compatible with Vercel Serverless and local environments.
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

const sanitize = (val?: string | null): string =>
  val ? val.trim().replace(/^["']|["']$/g, '') : '';

export function getBrevoConfig() {
  const apiKey = sanitize(process.env.BREVO_API_KEY);
  const senderEmail = sanitize(process.env.BREVO_SENDER_EMAIL);
  const senderName = sanitize(process.env.BREVO_SENDER_NAME) || 'PeoplePay360 Payroll';
  const testRecipient = sanitize(process.env.BREVO_TEST_RECIPIENT);

  const isPlaceholderKey =
    !apiKey ||
    apiKey === 'xkeysib-your-actual-api-key' ||
    apiKey.includes('your-actual-api-key') ||
    apiKey.includes('replace-with');

  const isPlaceholderSender =
    !senderEmail ||
    senderEmail === 'your-verified-email@example.com' ||
    senderEmail.includes('example.com');

  const isConfigured = Boolean(apiKey && !isPlaceholderKey && senderEmail && !isPlaceholderSender);

  return {
    apiKey,
    senderEmail,
    senderName,
    testRecipient,
    isPlaceholderKey,
    isPlaceholderSender,
    isConfigured,
    maskedApiKey: apiKey && !isPlaceholderKey
      ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`
      : null,
  };
}

/**
 * Dispatch an email via Brevo REST API v3
 */
export async function sendEmailWithBrevo(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const config = getBrevoConfig();

  // If no API key or placeholder key is configured, log simulation and return graceful success
  if (!config.isConfigured) {
    let reason = 'BREVO_API_KEY not configured';
    if (config.isPlaceholderKey) {
      reason = 'BREVO_API_KEY is using a placeholder value';
    } else if (config.isPlaceholderSender) {
      reason = 'BREVO_SENDER_EMAIL is missing or uses example.com placeholder';
    }

    console.info(`[BREVO SIMULATION] (${reason}). Simulated dispatch for:`, {
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
      error: undefined,
    };
  }

  try {
    // If a global test recipient override is set (useful for testing on Vercel/dev), route all emails there
    const targetRecipients = config.testRecipient
      ? [{ email: config.testRecipient, name: options.to[0]?.name || config.testRecipient }]
      : options.to;

    const payload = {
      sender: { name: config.senderName, email: config.senderEmail },
      to: targetRecipients.map((r) => ({
        email: r.email.trim(),
        name: (r.name || r.email).trim(),
      })),
      subject: options.subject,
      htmlContent: options.htmlContent,
      ...(options.attachments && options.attachments.length > 0 && {
        attachment: options.attachments.map((a) => ({
          content: a.content.replace(/^data:[^;]+;base64,/, ''), // Ensure raw base64 string
          name: a.name,
        })),
      }),
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let data: Record<string, any> = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    if (!res.ok) {
      let friendlyError = data.message || data.error || responseText;

      if (res.status === 401 || data.code === 'unauthorized') {
        friendlyError = `Brevo Authentication Failed (HTTP 401): Invalid API key. Verify that BREVO_API_KEY in .env.local or Vercel Environment Variables is an active v3 API key from https://app.brevo.com/settings/keys/api`;
      } else if (res.status === 400 && (data.code === 'invalid_parameter' || friendlyError?.toLowerCase().includes('sender'))) {
        friendlyError = `Brevo Sender Error (HTTP 400): Sender email '${config.senderEmail}' is not verified. In Brevo, go to 'Senders & IP' > 'Senders' to add and verify this email.`;
      } else if (res.status === 402 || res.status === 403) {
        friendlyError = `Brevo Account Limit (HTTP ${res.status}): Account limit reached or plan restriction. ${data.message || ''}`;
      }

      console.error('[BREVO ERROR RESPONSE]', {
        status: res.status,
        error: friendlyError,
        raw: data,
      });

      return {
        success: false,
        simulated: false,
        error: friendlyError,
        recipientCount: options.to.length,
      };
    }

    return {
      success: true,
      simulated: false,
      messageId: data.messageId || `brevo_${Date.now()}`,
      recipientCount: targetRecipients.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error connecting to Brevo API';
    console.error('[BREVO EXCEPTION]', msg);
    return {
      success: false,
      simulated: false,
      error: `Brevo Network Error: ${msg}`,
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1117; color: #e2e8f0; padding: 24px; margin: 0; }
    .card { max-width: 580px; margin: 0 auto; background-color: #1a1d27; border: 1px solid #2a2d3e; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid #2a2d3e; padding-bottom: 16px; margin-bottom: 24px; }
    .title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .subtitle { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; background-color: rgba(59,110,240,0.15); color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .metrics { display: flex; margin: 24px 0; background-color: #111319; border: 1px solid #2a2d3e; border-radius: 8px; }
    .metric-col { flex: 1; padding: 16px; text-align: center; border-right: 1px solid #2a2d3e; }
    .metric-col:last-child { border-right: none; }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; font-weight: 600; }
    .metric-value { font-size: 20px; font-weight: 800; color: #ffffff; font-family: monospace; }
    .metric-value.net { color: #34d399; }
    .notice { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 20px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #2a2d3e; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">PEOPLEPAY360</h1>
      <p class="subtitle">Payslip for ${period} &middot; ${payrunName}</p>
      <span class="badge">Confidential Salary Statement</span>
    </div>

    <p style="margin: 0 0 12px; font-size: 15px;">Dear <strong>${employeeName}</strong>,</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
      Your salary for the period <strong>${period}</strong> has been processed and credited. Please find the earnings and deductions summary below:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111319; border: 1px solid #2a2d3e; border-radius: 8px; margin: 20px 0;">
      <tr>
        <td width="50%" style="padding: 16px; text-align: center; border-right: 1px solid #2a2d3e;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; font-weight: 600;">Gross Salary</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; font-family: monospace;">${formattedGross}</div>
        </td>
        <td width="50%" style="padding: 16px; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; font-weight: 600;">Net Salary (Take-Home)</div>
          <div style="font-size: 20px; font-weight: 800; color: #34d399; font-family: monospace;">${formattedNet}</div>
        </td>
      </tr>
    </table>

    <p class="notice">
      ${pdfBase64
        ? 'A detailed breakdown of your basic pay, allowances, and statutory deductions is attached as a PDF.'
        : 'You can log in to your PeoplePay360 Employee Self-Service portal at any time to view, download, or print your itemized payslip.'
      }
    </p>

    <div class="footer">
      PeoplePay360 Integrated HR &amp; Payroll Platform &middot; Automated confidential delivery.
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
    subject: `Salary Statement for ${period} — PeoplePay360`,
    htmlContent,
    attachments,
  });
}
