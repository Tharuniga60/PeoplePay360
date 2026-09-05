import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createLeaveRequestSchema, updateLeaveStatusSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const status = searchParams.get('status');

  const conditions = [];
  if (employeeId) conditions.push(eq(leaveRequests.employeeId, employeeId));
  if (status) conditions.push(eq(leaveRequests.status, status as 'pending'));

  const result = await db.query.leaveRequests.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { employee: true, leaveType: true },
    orderBy: (l, { desc }) => [desc(l.createdAt)],
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
