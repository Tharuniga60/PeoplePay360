import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { createContractSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canManageEmployees } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id');

  if (session.user.role === 'employee' && employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = employeeId
    ? await db.query.contracts.findMany({
        where: eq(contracts.employeeId, employeeId),
        with: { salaryStructure: true, schedule: true },
        orderBy: [desc(contracts.startDate)],
      })
    : await db.query.contracts.findMany({
        with: { employee: true, salaryStructure: true, schedule: true },
        orderBy: [desc(contracts.startDate)],
        limit: 100,
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
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  // Check: Does an overlapping active contract exist for this Employee?
  if (parsed.data.status === 'active') {
    const existingActiveContracts = await db.query.contracts.findMany({
      where: and(
        eq(contracts.employeeId, parsed.data.employeeId),
        eq(contracts.status, 'active')
      ),
    });

    const newStart = new Date(parsed.data.startDate).getTime();
    const newEnd = parsed.data.endDate ? new Date(parsed.data.endDate).getTime() : Infinity;

    const hasOverlap = existingActiveContracts.some((c) => {
      const cStart = new Date(c.startDate).getTime();
      const cEnd = c.endDate ? new Date(c.endDate).getTime() : Infinity;
      return newStart <= cEnd && newEnd >= cStart;
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Employee already has an active contract for this timeframe.' },
        { status: 400 }
      );
    }
  }

  const insertData = {
    ...parsed.data,
    wage: parsed.data.wage.toString(),
  };

  const [contract] = await db.insert(contracts).values(insertData).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'contracts',
    entityId: contract.id,
    action: 'CREATE',
    changes: insertData,
  });

  return NextResponse.json({ data: contract }, { status: 201 });
}
