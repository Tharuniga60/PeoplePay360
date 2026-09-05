import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns, payslips } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { canApprovePayrun } from '@/lib/rbac';
import { recordAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role || '';
  if (!canApprovePayrun(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Payroll Managers and Administrators can mark payruns as paid' },
      { status: 403 }
    );
  }

  const payrun = await db.query.payruns.findFirst({
    where: and(eq(payruns.id, params.id), eq(payruns.companyId, session.user.companyId)),
  });

  if (!payrun) {
    return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });
  }

  if (payrun.status !== 'validated' && payrun.status !== 'approved') {
    return NextResponse.json(
      {
        error: `Invalid state transition: Payrun must be in 'validated' or 'approved' status before marking as paid. Current status is '${payrun.status}'.`,
      },
      { status: 400 }
    );
  }

  const paidAt = new Date();

  // 1. Update payrun status to paid
  const [updatedPayrun] = await db
    .update(payruns)
    .set({
      status: 'paid',
      paidAt,
      updatedAt: paidAt,
    })
    .where(eq(payruns.id, payrun.id))
    .returning();

  // 2. Cascade status to all linked payslips
  await db
    .update(payslips)
    .set({
      status: 'paid',
      updatedAt: paidAt,
    })
    .where(eq(payslips.payrunId, payrun.id));

  // 3. Record audit event
  await recordAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'MARK_PAID',
    changes: {
      previousStatus: payrun.status,
      newStatus: 'paid',
      paidAt,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Payrun and all associated payslips successfully marked as paid',
    data: updatedPayrun,
  });
}
