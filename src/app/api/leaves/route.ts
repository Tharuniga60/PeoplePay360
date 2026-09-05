import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, leaveAllocations } from '@/db/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { createLeaveRequestSchema, updateLeaveStatusSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canApproveLeave } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id');
  const status = searchParams.get('status');

  if (session.user.role === 'employee') {
    if (!employeeId || employeeId !== session.user.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const conditions = [];
  if (employeeId) conditions.push(eq(leaveRequests.employeeId, employeeId));
  if (status) conditions.push(eq(leaveRequests.status, status as 'pending'));

  const result = await db.query.leaveRequests.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { employee: true, leaveType: true },
    orderBy: [desc(leaveRequests.createdAt)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  if (session.user.role === 'employee' && parsed.data.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: 'Forbidden: Can only submit own leave requests' }, { status: 403 });
  }

  // Real-time balance check: Remaining = Allocated - (Approved + Pending)
  const year = new Date(parsed.data.startDate).getFullYear();
  const allocation = await db.query.leaveAllocations.findFirst({
    where: and(
      eq(leaveAllocations.employeeId, parsed.data.employeeId),
      eq(leaveAllocations.leaveTypeId, parsed.data.leaveTypeId),
      eq(leaveAllocations.year, year)
    ),
  });

  if (allocation) {
    const total = parseFloat(allocation.totalDays.toString());
    const used = parseFloat(allocation.usedDays.toString());
    const remaining = total - used;
    const requested = parsed.data.numberOfDays;
    if (requested > remaining) {
      return NextResponse.json(
        { error: `Insufficient leave balance. You have ${remaining} days remaining, requested ${requested} days.` },
        { status: 400 }
      );
    }
  }

  const insertData = {
    ...parsed.data,
    numberOfDays: parsed.data.numberOfDays.toString(),
  };

  const [leave] = await db.insert(leaveRequests).values(insertData).returning();

  return NextResponse.json({ data: leave }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  if (!canApproveLeave(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateLeaveStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [updated] = await db
    .update(leaveRequests)
    .set({
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      approvedById: parsed.data.status === 'approved' ? session.user.id : null,
      approvedAt: parsed.data.status === 'approved' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(leaveRequests.id, id))
    .returning();

  // When approved: update the leave allocation balance (increment usedDays)
  if (parsed.data.status === 'approved' && updated) {
    const year = new Date(updated.startDate).getFullYear();
    await db
      .update(leaveAllocations)
      .set({
        usedDays: sql`${leaveAllocations.usedDays} + ${updated.numberOfDays}::numeric`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leaveAllocations.employeeId, updated.employeeId),
          eq(leaveAllocations.leaveTypeId, updated.leaveTypeId),
          eq(leaveAllocations.year, year)
        )
      );
  }

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leave_requests',
    entityId: id,
    action: 'UPDATE',
    changes: { status: parsed.data.status },
  });

  return NextResponse.json({ data: updated });
}

