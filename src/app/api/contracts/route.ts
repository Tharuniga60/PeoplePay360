import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createContractSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  const result = employeeId
    ? await db.query.contracts.findMany({
        where: eq(contracts.employeeId, employeeId),
        with: { salaryStructure: true, schedule: true },
        orderBy: (c, { desc }) => [desc(c.startDate)],
      })
    : [];

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [contract] = await db.insert(contracts).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'contracts',
    entityId: contract.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: contract }, { status: 201 });
}
