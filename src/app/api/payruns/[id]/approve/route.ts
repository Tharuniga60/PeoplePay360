import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns, payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canApprovePayrun } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canApprovePayrun(session.user.role)) {
    return NextResponse.json({ error: 'Only payroll managers or admins can approve payruns' }, { status: 403 });
  }

  const payrun = await db.query.payruns.findFirst({ where: eq(payruns.id, params.id) });
  if (!payrun) return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });
  if (!['computed', 'validated'].includes(payrun.status)) {
    return NextResponse.json({ error: `Cannot approve payrun in status: ${payrun.status}` }, { status: 400 });
  }

  // Approve payrun and all its payslips
  const [updatedPayrun] = await db
    .update(payruns)
    .set({
      status: 'approved',
      approvedAt: new Date(),
      approvedById: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(payruns.id, params.id))
    .returning();

  await db
    .update(payslips)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(payslips.payrunId, params.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'APPROVE',
    changes: { previousStatus: payrun.status, newStatus: 'approved' },
  });

  return NextResponse.json({ data: updatedPayrun });
}
