import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, leaveAllocations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { canApproveLeave } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, params.id),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
      leaveType: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  if (session.user.role === 'employee' && session.user.employeeId !== request.employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: request });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  const isManager = canApproveLeave(session.user.role || '');
  const isOwner = session.user.employeeId === existing.employeeId;

  const body = await req.json();
  const { status, rejectionReason, reason } = body;

  // Status transition validation
  if (status && ['approved', 'rejected'].includes(status) && !isManager) {
    return NextResponse.json({ error: 'Only managers can approve or refuse requests' }, { status: 403 });
  }

  if (status === 'cancelled' && !isOwner && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (status !== undefined) {
    updateData.status = status;
    if (status === 'approved') {
      updateData.approvedById = session.user.id;
      updateData.approvedAt = new Date();
    } else if (status === 'pending') {
      updateData.approvedById = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
    }
  }

  if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
  if (reason !== undefined) updateData.reason = reason;

  const [updated] = await db
    .update(leaveRequests)
    .set(updateData)
    .where(eq(leaveRequests.id, existing.id))
    .returning();

  // Balance adjustments:
  // If moving to approved, deduct (increment usedDays)
  if (status === 'approved' && existing.status !== 'approved') {
    const year = new Date(existing.startDate).getFullYear();
    await db
      .update(leaveAllocations)
      .set({
        usedDays: sql`${leaveAllocations.usedDays} + ${existing.numberOfDays}::numeric`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leaveAllocations.employeeId, existing.employeeId),
          eq(leaveAllocations.leaveTypeId, existing.leaveTypeId),
          eq(leaveAllocations.year, year)
        )
      );
  }
  // If was previously approved and now reset/rejected/cancelled, restore (decrement usedDays)
  else if (existing.status === 'approved' && status && status !== 'approved') {
    const year = new Date(existing.startDate).getFullYear();
    await db
      .update(leaveAllocations)
      .set({
        usedDays: sql`GREATEST(0, ${leaveAllocations.usedDays} - ${existing.numberOfDays}::numeric)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leaveAllocations.employeeId, existing.employeeId),
          eq(leaveAllocations.leaveTypeId, existing.leaveTypeId),
          eq(leaveAllocations.year, year)
        )
      );
  }

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leave_requests',
    entityId: existing.id,
    action: 'UPDATE',
    changes: { previous: existing.status, updated: status, rejectionReason },
  });

  return NextResponse.json({ data: updated });
}
