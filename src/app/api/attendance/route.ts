import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';
import { createAttendanceSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
  }

  const conditions = [eq(attendances.employeeId, employeeId)];
  if (from) conditions.push(gte(attendances.attendanceDate, from));
  if (to) conditions.push(lte(attendances.attendanceDate, to));

  const result = await db
    .select()
    .from(attendances)
    .where(and(...conditions))
    .orderBy(attendances.attendanceDate);

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Support bulk insert (array) or single
  const records = Array.isArray(body) ? body : [body];
  const parsed = records.map((r) => createAttendanceSchema.safeParse(r));
  const errors = parsed.filter((p) => !p.success);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', issues: errors }, { status: 400 });
  }

  const values = parsed.map((p) => (p as { success: true; data: typeof p extends { success: true; data: infer D } ? D : never }).data);
  const inserted = await db
    .insert(attendances)
    .values(values)
    .onConflictDoUpdate({
      target: [attendances.employeeId, attendances.attendanceDate],
      set: {
        workedHours: attendances.workedHours,
        overtimeHours: attendances.overtimeHours,
        status: attendances.status,
        checkIn: attendances.checkIn,
        checkOut: attendances.checkOut,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ data: inserted }, { status: 201 });
}
