import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns, payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { createPayrunSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId') ?? session.user.companyId;

  const result = await db.query.payruns.findMany({
    where: eq(payruns.companyId, companyId),
    with: { salaryStructure: true },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createPayrunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const { employeeIds, ...payrunData } = parsed.data;

  // Create the payrun in draft
  const [payrun] = await db
    .insert(payruns)
    .values({
      ...payrunData,
      status: 'draft',
      totalEmployees: employeeIds.length,
      createdById: session.user.id,
    })
    .returning();

  // Create empty payslip stubs for each employee
  if (employeeIds.length > 0) {
    await db.insert(payslips).values(
      employeeIds.map((empId) => ({
        payrunId: payrun.id,
        employeeId: empId,
        status: 'draft' as const,
      }))
    );
  }

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'CREATE',
    changes: { employeeCount: employeeIds.length, period: `${payrunData.periodStart} to ${payrunData.periodEnd}` },
  });

  return NextResponse.json({ data: payrun }, { status: 201 });
}
