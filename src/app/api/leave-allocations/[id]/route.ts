import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canApproveLeave } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allocation = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.id, params.id),
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

  if (!allocation) {
    return NextResponse.json({ error: 'Leave allocation not found' }, { status: 404 });
  }

  if (session.user.role === 'employee' && session.user.employeeId !== allocation.employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: allocation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canApproveLeave(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: Only managers can modify allocations' }, { status: 403 });
  }

  const existing = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave allocation not found' }, { status: 404 });
  }

  const body = await req.json();
  const { totalDays, status, validityStart, validityEnd, notes, year } = body;

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (totalDays !== undefined) updateData.totalDays = totalDays.toString();
  if (status !== undefined) updateData.status = status;
  if (validityStart !== undefined) updateData.validityStart = validityStart;
  if (validityEnd !== undefined) updateData.validityEnd = validityEnd;
  if (notes !== undefined) updateData.notes = notes;
  if (year !== undefined) updateData.year = year;

  const [updated] = await db
    .update(leaveAllocations)
    .set(updateData)
    .where(eq(leaveAllocations.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveAllocations',
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

  if (!canApproveLeave(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave allocation not found' }, { status: 404 });
  }

  if (parseFloat(existing.usedDays.toString()) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete allocation that already has used leave days.' },
      { status: 400 }
    );
  }

  await db.delete(leaveAllocations).where(eq(leaveAllocations.id, existing.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveAllocations',
    entityId: existing.id,
    action: 'DELETE',
    changes: existing,
  });

  return NextResponse.json({ message: 'Leave allocation deleted successfully' });
}
