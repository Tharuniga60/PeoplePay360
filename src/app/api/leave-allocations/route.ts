import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createLeaveAllocationSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
  }

  const result = await db.query.leaveAllocations.findMany({
    where: eq(leaveAllocations.employeeId, employeeId),
    with: { leaveType: true },
    orderBy: (la, { desc }) => [desc(la.year)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createLeaveAllocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const insertData = {
    ...parsed.data,
    totalDays: parsed.data.totalDays.toString(),
  };

  const [allocation] = await db.insert(leaveAllocations).values(insertData).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveAllocations',
    entityId: allocation.id,
    action: 'CREATE',
    changes: insertData,
  });

  return NextResponse.json({ data: allocation }, { status: 201 });
}
