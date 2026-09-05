import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createEmployeeSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.employees.findMany({
    where: eq(employees.companyId, companyId),
    with: {
      department: true,
      jobPosition: true,
      contracts: {
        where: (c, { eq: eqFn }) => eqFn(c.status, 'active'),
        limit: 1,
      },
    },
    orderBy: (e, { asc }) => [asc(e.firstName), asc(e.lastName)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [employee] = await db.insert(employees).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'employees',
    entityId: employee.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: employee }, { status: 201 });
}
