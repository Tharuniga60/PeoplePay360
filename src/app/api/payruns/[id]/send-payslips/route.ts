import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns, payslips, emailDispatches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { canComputePayrun, canApprovePayrun } from '@/lib/rbac';
import { sendPayslipEmail } from '@/lib/email';
import { recordAuditEvent } from '@/lib/audit';
import { formatDate } from '@/lib/utils';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role || '';
  if (!canComputePayrun(role) && !canApprovePayrun(role)) {
    return NextResponse.json({ error: 'Forbidden: Payroll permissions required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const retryFailedOnly = searchParams.get('retry_failed_only') === 'true';

  const payrun = await db.query.payruns.findFirst({
    where: and(eq(payruns.id, params.id), eq(payruns.companyId, session.user.companyId)),
    with: {
      payslips: {
        with: {
          employee: true,
          lines: true,
        },
      },
    },
  });

  if (!payrun) {
    return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });
  }

  if (!['validated', 'approved', 'paid'].includes(payrun.status)) {
    return NextResponse.json(
      { error: `Cannot send payslips for payrun in '${payrun.status}' status. Payrun must be at least validated or approved.` },
      { status: 400 }
    );
  }

  if (payrun.payslips.length === 0) {
    return NextResponse.json(
      { error: 'No payslips found in this payrun to send.' },
      { status: 400 }
    );
  }

  // Fetch existing dispatches if retryFailedOnly is requested
  const existingDispatches = await db.query.emailDispatches.findMany({
    where: and(
      eq(emailDispatches.payrunId, payrun.id),
      eq(emailDispatches.companyId, session.user.companyId)
    ),
  });
  const successfulSlipIds = new Set(
    existingDispatches
      .filter((d) => d.status === 'sent' || d.status === 'simulated')
      .map((d) => d.payslipId)
  );

  const periodString = `${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}`;
  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const ps of payrun.payslips) {
    // If retrying only failed, skip already successfully delivered/simulated slips
    if (retryFailedOnly && successfulSlipIds.has(ps.id)) {
      skippedCount++;
      continue;
    }

    const email = ps.employee?.email;
    const name = `${ps.employee?.firstName} ${ps.employee?.lastName}`;

    if (!email) {
      failedCount++;
      await db.insert(emailDispatches).values({
        companyId: session.user.companyId,
        payrunId: payrun.id,
        payslipId: ps.id,
        recipientEmail: 'none',
        recipientName: name,
        status: 'failed',
        errorMessage: 'Employee record has no work email address configured',
      });
      continue;
    }

    const grossNum = parseFloat(ps.grossTotal?.toString() || '0');
    const netNum = parseFloat(ps.netTotal?.toString() || '0');

    try {
      const result = await sendPayslipEmail({
        toEmail: email,
        employeeName: name,
        period: periodString,
        payrunName: payrun.name,
        gross: grossNum,
        net: netNum,
      });

      if (result.success) {
        const dispatchStatus = result.simulated ? 'simulated' : 'sent';
        if (result.simulated) simulatedCount++;
        else sentCount++;

        await db.insert(emailDispatches).values({
          companyId: session.user.companyId,
          payrunId: payrun.id,
          payslipId: ps.id,
          recipientEmail: email,
          recipientName: name,
          status: dispatchStatus,
          providerMessageId: (result as any).messageId ?? null,
          lastAttemptAt: new Date(),
        });
      } else {
        failedCount++;
        await db.insert(emailDispatches).values({
          companyId: session.user.companyId,
          payrunId: payrun.id,
          payslipId: ps.id,
          recipientEmail: email,
          recipientName: name,
          status: 'failed',
          errorMessage: result.error ?? 'Email delivery failed',
          lastAttemptAt: new Date(),
        });
      }
    } catch (err: any) {
      failedCount++;
      await db.insert(emailDispatches).values({
        companyId: session.user.companyId,
        payrunId: payrun.id,
        payslipId: ps.id,
        recipientEmail: email,
        recipientName: name,
        status: 'failed',
        errorMessage: err.message ?? 'Unexpected error during payslip dispatch',
        lastAttemptAt: new Date(),
      });
    }
  }

  await recordAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'SEND_EMAIL',
    changes: {
      action: retryFailedOnly ? 'RETRY_FAILED_PAYSLIP_EMAILS' : 'BULK_EMAIL_PAYSLIPS',
      sentCount,
      simulatedCount,
      failedCount,
      skippedCount,
      totalCount: payrun.payslips.length,
    },
  });

  return NextResponse.json({
    message: `Payslip emails processed: ${sentCount} delivered, ${simulatedCount} simulated, ${failedCount} failed, ${skippedCount} skipped.`,
    sentCount,
    simulatedCount,
    failedCount,
    skippedCount,
    total: payrun.payslips.length,
  });
}
