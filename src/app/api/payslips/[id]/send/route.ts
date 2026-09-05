import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canComputePayrun } from '@/lib/rbac';
import { sendPayslipEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { formatDate } from '@/lib/utils';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canComputePayrun(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: Payroll permissions required' }, { status: 403 });
  }

  const payslip = await db.query.payslips.findFirst({
    where: eq(payslips.id, params.id),
    with: {
      employee: true,
      payrun: true,
      lines: true,
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
  }

  let customRecipient: string | undefined;
  try {
    const body = await _req.json();
    customRecipient = body.recipientEmail?.trim();
  } catch {
    // Body optional
  }

  const email = customRecipient || payslip.employee?.email;
  if (!email) {
    return NextResponse.json({ error: 'No recipient email address specified' }, { status: 400 });
  }

  const empName = `${payslip.employee?.firstName} ${payslip.employee?.lastName}`;
  const period = payslip.payrun
    ? `${formatDate(payslip.payrun.periodStart)} – ${formatDate(payslip.payrun.periodEnd)}`
    : 'Pay Period';

  const result = await sendPayslipEmail({
    toEmail: email,
    employeeName: empName,
    period,
    payrunName: payslip.payrun?.name || 'Standard Payrun',
    gross: parseFloat(payslip.grossTotal?.toString() || '0'),
    net: parseFloat(payslip.netTotal?.toString() || '0'),
  });

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payslips',
    entityId: payslip.id,
    action: 'UPDATE',
    changes: {
      action: 'EMAIL_PAYSLIP',
      recipient: email,
      simulated: result.simulated,
      success: result.success,
    },
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to dispatch email' }, { status: 500 });
  }

  return NextResponse.json({
    message: result.simulated
      ? `Simulated email delivery to ${email} (configure BREVO_API_KEY for live delivery)`
      : `Payslip email delivered to ${email}`,
    simulated: result.simulated,
    messageId: result.messageId,
  });
}
