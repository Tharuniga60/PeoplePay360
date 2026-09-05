import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scheduleLines, workingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { z } from 'zod';

const scheduleLineSchema = z.object({
  scheduleId: z.string().uuid(),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  workFrom: z.string().min(1),
  workTo: z.string().min(1),
  breakDurationMinutes: z.number().int().min(0).default(60),
  isWorkingDay: z.boolean().default(true),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lines = await db
    .select()
    .from(scheduleLines)
    .where(eq(scheduleLines.scheduleId, params.id));

  return NextResponse.json({ data: lines });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['admin', 'hr_manager', 'hr_payroll_manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const records = Array.isArray(body) ? body : [body];

  const parsed = records.map((r) => scheduleLineSchema.safeParse({ ...r, scheduleId: params.id }));
  const errors = parsed.filter((p) => !p.success);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', issues: errors }, { status: 400 });
  }

  const values = parsed.map((p) => (p as { success: true; data: z.infer<typeof scheduleLineSchema> }).data);
  const inserted = await db.insert(scheduleLines).values(values).returning();

  return NextResponse.json({ data: inserted }, { status: 201 });
}
