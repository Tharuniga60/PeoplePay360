import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createSalaryRuleSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const salaryStructureId = searchParams.get('salaryStructureId');

  if (!salaryStructureId) {
    return NextResponse.json({ error: 'salaryStructureId is required' }, { status: 400 });
  }

  const result = await db.query.salaryRules.findMany({
    where: eq(salaryRules.salaryStructureId, salaryStructureId),
    orderBy: (sr, { asc }) => [asc(sr.sequence)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSalaryRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [rule] = await db.insert(salaryRules).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'salaryRules',
    entityId: rule.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: rule }, { status: 201 });
}
