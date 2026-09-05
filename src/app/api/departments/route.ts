import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { departments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createDepartmentSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.departments.findMany({
    where: eq(departments.companyId, companyId),
    with: { manager: true, branch: true },
    orderBy: (d, { asc }) => [asc(d.name)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [department] = await db.insert(departments).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'departments',
    entityId: department.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: department }, { status: 201 });
}
