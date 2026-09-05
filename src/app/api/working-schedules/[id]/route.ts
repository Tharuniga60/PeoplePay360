import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workingSchedules, scheduleLines, contracts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schedule = await db.query.workingSchedules.findFirst({
    where: eq(workingSchedules.id, params.id),
    with: {
      scheduleLines: true,
      contracts: {
        where: eq(contracts.status, 'active'),
        with: { employee: true },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }

  return NextResponse.json({ data: schedule });
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

  const existing = await db.query.workingSchedules.findFirst({
    where: eq(workingSchedules.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, timezone, hoursPerWeek, isActive, lines } = body;

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (hoursPerWeek !== undefined) updateData.hoursPerWeek = hoursPerWeek;
  if (isActive !== undefined) updateData.isActive = isActive;

  const [updated] = await db
    .update(workingSchedules)
    .set(updateData)
    .where(eq(workingSchedules.id, existing.id))
    .returning();

  // If daily lines were provided, replace schedule lines
  if (Array.isArray(lines)) {
    await db.delete(scheduleLines).where(eq(scheduleLines.scheduleId, existing.id));

    const workingLines = lines.filter((l: any) => l.isWorkingDay);
    if (workingLines.length > 0) {
      await db.insert(scheduleLines).values(
        workingLines.map((l: any) => ({
          scheduleId: existing.id,
          dayOfWeek: l.dayOfWeek,
          workFrom: l.workFrom,
          workTo: l.workTo,
          breakDurationMinutes: Number(l.breakDurationMinutes) || 0,
          isWorkingDay: true,
        }))
      );
    }
  }

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'working_schedules',
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

  const activeContractUsing = await db.query.contracts.findFirst({
    where: and(eq(contracts.scheduleId, params.id), eq(contracts.status, 'active')),
  });

  if (activeContractUsing) {
    return NextResponse.json(
      { error: 'Cannot delete schedule because active contracts are assigned to it.' },
      { status: 400 }
    );
  }

  await db.delete(scheduleLines).where(eq(scheduleLines.scheduleId, params.id));
  await db.delete(workingSchedules).where(eq(workingSchedules.id, params.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'working_schedules',
    entityId: params.id,
    action: 'DELETE',
    changes: { id: params.id },
  });

  return NextResponse.json({ message: 'Schedule deleted successfully' });
}
