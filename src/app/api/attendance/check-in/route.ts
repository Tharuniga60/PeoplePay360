import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances, employees, scheduleLines } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employeeId = session.user.employeeId;
  if (!employeeId) {
    return NextResponse.json({ data: null, message: 'No linked employee' });
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  const existing = await db.query.attendances.findFirst({
    where: and(
      eq(attendances.employeeId, employeeId),
      eq(attendances.attendanceDate, today)
    ),
  });

  return NextResponse.json({ data: existing ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employeeId = session.user.employeeId;
  if (!employeeId) {
    return NextResponse.json({ error: 'User is not linked to an employee record' }, { status: 400 });
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  // Find existing attendance record for today
  const existing = await db.query.attendances.findFirst({
    where: and(
      eq(attendances.employeeId, employeeId),
      eq(attendances.attendanceDate, today)
    ),
  });

  if (!existing || !existing.checkIn) {
    // ── CHECK IN ──
    const [record] = await db
      .insert(attendances)
      .values({
        employeeId,
        attendanceDate: today,
        checkIn: now,
        status: 'present',
      })
      .onConflictDoUpdate({
        target: [attendances.employeeId, attendances.attendanceDate],
        set: {
          checkIn: now,
          status: 'present',
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json({
      action: 'check_in',
      message: `Checked in successfully at ${format(now, 'HH:mm:ss')}`,
      data: record,
    });
  } else if (!existing.checkOut) {
    // ── CHECK OUT ──
    const checkInTime = new Date(existing.checkIn).getTime();
    const checkOutTime = now.getTime();
    const grossMinutes = Math.max(0, Math.floor((checkOutTime - checkInTime) / (1000 * 60)));
    const breakMinutes = 60; // standard 1 hour break default
    const workedMinutes = Math.max(0, grossMinutes - breakMinutes);
    const workedHours = (workedMinutes / 60).toFixed(2);

    const [record] = await db
      .update(attendances)
      .set({
        checkOut: now,
        workedHours: workedHours,
        updatedAt: now,
      })
      .where(eq(attendances.id, existing.id))
      .returning();

    return NextResponse.json({
      action: 'check_out',
      message: `Checked out successfully at ${format(now, 'HH:mm:ss')}. Worked: ${workedHours}h`,
      data: record,
    });
  } else {
    return NextResponse.json({
      action: 'already_completed',
      message: `You have already checked out for today at ${format(new Date(existing.checkOut), 'HH:mm:ss')}`,
      data: existing,
    });
  }
}
