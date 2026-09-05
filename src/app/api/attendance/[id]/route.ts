import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const record = await db.query.attendances.findFirst({
    where: eq(attendances.id, params.id),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
    },
  });

  if (!record) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  if (session.user.role === 'employee' && session.user.employeeId !== record.employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: record });
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

  const existing = await db.query.attendances.findFirst({
    where: eq(attendances.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  const body = await req.json();
  const { checkIn, checkOut, workedHours, status, notes } = body;

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (checkIn !== undefined) updateData.checkIn = checkIn ? new Date(checkIn) : null;
  if (checkOut !== undefined) updateData.checkOut = checkOut ? new Date(checkOut) : null;
  if (workedHours !== undefined) updateData.workedHours = workedHours ? workedHours.toString() : null;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const [updated] = await db
    .update(attendances)
    .set(updateData)
    .where(eq(attendances.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'attendances',
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

  const existing = await db.query.attendances.findFirst({
    where: eq(attendances.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  await db.delete(attendances).where(eq(attendances.id, existing.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'attendances',
    entityId: existing.id,
    action: 'DELETE',
    changes: existing,
  });

  return NextResponse.json({ message: 'Attendance record deleted' });
}
