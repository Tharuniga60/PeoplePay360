import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveTypes, leaveRequests, leaveAllocations } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { updateLeaveTypeSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = await db.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, params.id),
  });

  if (!type) {
    return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
  }

  return NextResponse.json({ data: type });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateLeaveTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [updated] = await db
    .update(leaveTypes)
    .set({
      ...parsed.data,
    })
    .where(eq(leaveTypes.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveTypes',
    entityId: updated.id,
    action: 'UPDATE',
    changes: { previous: existing, updated },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
  }

  // Check if requests or allocations are linked
  const hasRequests = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.leaveTypeId, params.id),
  });

  const hasAllocations = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.leaveTypeId, params.id),
  });

  if (hasRequests || hasAllocations) {
    return NextResponse.json(
      { error: 'Cannot delete leave type because leave requests or allocations exist for it.' },
      { status: 400 }
    );
  }

  await db.delete(leaveTypes).where(eq(leaveTypes.id, params.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveTypes',
    entityId: params.id,
    action: 'DELETE',
    changes: existing,
  });

  return NextResponse.json({ message: 'Leave type deleted successfully' });
}
