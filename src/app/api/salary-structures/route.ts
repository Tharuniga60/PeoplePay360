import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryStructures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createSalaryStructureSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.salaryStructures.findMany({
    where: eq(salaryStructures.companyId, companyId),
    with: { salaryRules: true },
    orderBy: (ss, { asc }) => [asc(ss.name)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSalaryStructureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [structure] = await db.insert(salaryStructures).values(parsed.data).returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'salaryStructures',
    entityId: structure.id,
    action: 'CREATE',
    changes: parsed.data,
  });

  return NextResponse.json({ data: structure }, { status: 201 });
}
