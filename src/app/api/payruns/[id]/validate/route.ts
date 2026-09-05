import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns, payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canComputePayrun, canApprovePayrun } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role || '';
  if (!canComputePayrun(role) && !canApprovePayrun(role)) {
    return NextResponse.json({ error: 'Forbidden: Payroll permissions required' }, { status: 403 });
  }

  const payrun = await db.query.payruns.findFirst({
    where: eq(payruns.id, params.id),
    with: { payslips: true },
  });

  if (!payrun) {
    return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });
  }

  if (payrun.status !== 'computed') {
    return NextResponse.json(
      { error: `Cannot validate payrun in status: ${payrun.status}. Only computed payruns can be validated.` },
      { status: 400 }
    );
  }

  if (payrun.payslips.length === 0) {
    return NextResponse.json(
      { error: 'Cannot validate a payrun with 0 generated payslips. Please compute first.' },
      { status: 400 }
    );
  }

  const [updatedPayrun] = await db
    .update(payruns)
    .set({
      status: 'validated',
      updatedAt: new Date(),
    })
    .where(eq(payruns.id, params.id))
    .returning();

  await db
    .update(payslips)
    .set({
      status: 'validated',
      updatedAt: new Date(),
    })
    .where(eq(payslips.payrunId, params.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'UPDATE',
    changes: { previousStatus: 'computed', newStatus: 'validated' },
  });

  return NextResponse.json({
    message: 'Payrun successfully validated and locked for final approval.',
    data: updatedPayrun,
  });
}
