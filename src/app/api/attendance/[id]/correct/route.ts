import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { format } from 'date-fns';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: HR Manager or Admin required' }, { status: 403 });
  }

  const body = await req.json();
  const { checkIn, checkOut, workedHours, reason } = body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'A correction reason note is strictly required' }, { status: 400 });
  }

  const existing = await db.query.attendances.findFirst({
    where: eq(attendances.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  const now = new Date();
  const adjustmentNote = `Manually adjusted by HR Admin on ${format(now, 'yyyy-MM-dd HH:mm')}: "${reason.trim()}"`;

  const [updated] = await db
    .update(attendances)
    .set({
      checkIn: checkIn ? new Date(checkIn) : existing.checkIn,
      checkOut: checkOut ? new Date(checkOut) : existing.checkOut,
      workedHours: workedHours ? workedHours.toString() : existing.workedHours,
      notes: existing.notes ? `${existing.notes} | ${adjustmentNote}` : adjustmentNote,
      updatedAt: now,
    })
    .where(eq(attendances.id, params.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'attendances',
    entityId: params.id,
    action: 'UPDATE',
    changes: {
      checkIn,
      checkOut,
      workedHours,
      reason,
      adjustedBy: session.user.name || session.user.email,
    },
  });

  return NextResponse.json({
    message: 'Attendance record corrected successfully',
    data: updated,
  });
}
