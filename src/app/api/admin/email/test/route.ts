import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getBrevoConfig, sendEmailWithBrevo } from '@/lib/email';
import { canComputePayrun } from '@/lib/rbac';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = getBrevoConfig();

  return NextResponse.json({
    status: config.isConfigured ? 'ready' : 'unconfigured',
    isConfigured: config.isConfigured,
    maskedApiKey: config.maskedApiKey,
    senderEmail: config.senderEmail || 'Not set',
    senderName: config.senderName,
    testRecipient: config.testRecipient || null,
    isPlaceholderKey: config.isPlaceholderKey,
    isPlaceholderSender: config.isPlaceholderSender,
    vercelGuidance: {
      message: 'On Vercel, configure BREVO_API_KEY, BREVO_SENDER_EMAIL, and BREVO_SENDER_NAME in Project Settings > Environment Variables.',
      senderRequirement: 'Ensure BREVO_SENDER_EMAIL is verified in Brevo Dashboard under Senders & IP > Senders.',
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canComputePayrun(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let recipientEmail: string | undefined;
  try {
    const body = await req.json();
    recipientEmail = body.recipientEmail?.trim();
  } catch {
    // Body optional
  }

  const targetEmail = recipientEmail || session.user.email;
  if (!targetEmail) {
    return NextResponse.json({ error: 'Recipient email address is required' }, { status: 400 });
  }

  const config = getBrevoConfig();

  const testHtml = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #3b82f6;">PeoplePay360 &times; Brevo Verification</h2>
      <p>Congratulations! Your Brevo transactional email integration is functioning properly.</p>
      <table style="border-collapse: collapse; margin-top: 15px; font-size: 13px;">
        <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Sender:</td><td>${config.senderName} &lt;${config.senderEmail}&gt;</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Recipient:</td><td>${targetEmail}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Timestamp:</td><td>${new Date().toISOString()}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; font-weight: bold;">Environment:</td><td>${process.env.VERCEL ? 'Vercel Production' : 'Local / Custom Server'}</td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
        This test email verifies that your API Key and Sender Domain credentials are authenticated with Brevo.
      </p>
    </div>
  `.trim();

  const result = await sendEmailWithBrevo({
    to: [{ email: targetEmail, name: session.user.name || 'Admin User' }],
    subject: `PeoplePay360 — Brevo Email Test (${new Date().toLocaleDateString()})`,
    htmlContent: testHtml,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        config: {
          senderEmail: config.senderEmail,
          hasKey: Boolean(config.apiKey),
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: result.simulated
      ? `Simulated dispatch to ${targetEmail}. Configure real BREVO_API_KEY and verified BREVO_SENDER_EMAIL for live delivery.`
      : `Test email successfully dispatched to ${targetEmail} via Brevo!`,
    simulated: result.simulated,
    messageId: result.messageId,
  });
}
