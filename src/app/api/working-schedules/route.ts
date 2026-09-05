import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createWorkingScheduleSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.workingSchedules.findMany({
    where: eq(workingSchedules.companyId, companyId),
    with: { scheduleLines: true },
    orderBy: (ws, { asc }) => [asc(ws.name)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createWorkingScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const insertData = {
    ...parsed.data,
    hoursPerWeek: parsed.data.hoursPerWeek.toString(),
  };

  const [schedule] = await db.insert(workingSchedules).values(insertData).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'workingSchedules',
    entityId: schedule.id,
    action: 'CREATE',
    changes: insertData,
  });

  return NextResponse.json({ data: schedule }, { status: 201 });
}
