import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveTypes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createLeaveTypeSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.companyId, companyId),
    orderBy: (lt, { asc }) => [asc(lt.name)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createLeaveTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [leaveType] = await db.insert(leaveTypes).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'leaveTypes',
    entityId: leaveType.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: leaveType }, { status: 201 });
}
