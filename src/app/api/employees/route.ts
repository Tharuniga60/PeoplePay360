import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees, contracts } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { auth } from '@/auth';
import { createEmployeeSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canManageEmployees } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.employees.findMany({
    where: eq(employees.companyId, companyId),
    with: {
      department: true,
      jobPosition: true,
      contracts: {
        where: eq(contracts.status, 'active'),
        limit: 1,
      },
    },
    orderBy: [asc(employees.firstName), asc(employees.lastName)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
