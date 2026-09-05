import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees, contracts, workingSchedules } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schedule = await db.query.workingSchedules.findFirst({
    where: eq(workingSchedules.id, params.id),
  });

  if (!schedule) {
    return NextResponse.json({ error: 'Working schedule not found' }, { status: 404 });
  }

  const body = await req.json();
  const { employeeIds } = body;

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: 'employeeIds array is required and cannot be empty' }, { status: 400 });
  }

  // 1. Update employee default schedule
  await db
    .update(employees)
    .set({
      defaultScheduleId: schedule.id,
      updatedAt: new Date(),
    })
    .where(inArray(employees.id, employeeIds));

  // 2. Also update running active contracts for these employees to bind this schedule
  await db
    .update(contracts)
    .set({
      scheduleId: schedule.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(contracts.employeeId, employeeIds),
        eq(contracts.status, 'active')
      )
    );

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'working_schedules',
    entityId: schedule.id,
    action: 'UPDATE',
    changes: { employeeIds, scheduleId: schedule.id, description: 'MASS_ASSIGN_WORKING_SCHEDULE' },
  });

  return NextResponse.json({
    message: `Successfully assigned ${schedule.name} to ${employeeIds.length} employee(s)`,
    assignedCount: employeeIds.length,
  });
}
