import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobPositions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createJobPositionSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.jobPositions.findMany({
    where: eq(jobPositions.companyId, companyId),
    with: { department: true },
    orderBy: (jp, { asc }) => [asc(jp.title)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createJobPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [jobPosition] = await db.insert(jobPositions).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'jobPositions',
    entityId: jobPosition.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: jobPosition }, { status: 201 });
}
