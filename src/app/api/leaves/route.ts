import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, leaveAllocations } from '@/db/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { createLeaveRequestSchema, updateLeaveStatusSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canApproveLeave } from '@/lib/rbac';
import { computeLeaveBalance } from '@/lib/engine/leave-balance-engine';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id');
  const status = searchParams.get('status');

  let targetEmployeeId = employeeId;
  if (session.user.role === 'employee') {
    if (employeeId && employeeId !== session.user.employeeId) {
      return NextResponse.json({ error: 'Forbidden: Cannot access other employees leave records' }, { status: 403 });
    }
    targetEmployeeId = session.user.employeeId;
  }

  const conditions = [];
  if (targetEmployeeId) conditions.push(eq(leaveRequests.employeeId, targetEmployeeId));
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

  // Centralized Leave Balance Engine verification
  const year = new Date(parsed.data.startDate).getFullYear();
  const balanceSummary = await computeLeaveBalance({
    employeeId: parsed.data.employeeId,
    leaveTypeId: parsed.data.leaveTypeId,
    year,
    requestStartDate: parsed.data.startDate,
    requestEndDate: parsed.data.endDate,
  });

  if (parsed.data.numberOfDays > balanceSummary.remainingDays) {
    return NextResponse.json(
      {
        error: `Insufficient leave balance. You have ${balanceSummary.remainingDays} days available for this leave type, but requested ${parsed.data.numberOfDays} days.`,
        details: balanceSummary,
      },
      { status: 422 }
    );
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

