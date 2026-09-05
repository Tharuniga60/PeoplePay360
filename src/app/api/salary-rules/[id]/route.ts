import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { canManagePayrollConfig, canAccessPayroll } from '@/lib/rbac';
import { updateSalaryRuleSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { validateFormulaExpression } from '@/lib/engine/formula-validator';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessPayroll(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rule = await db.query.salaryRules.findFirst({
    where: eq(salaryRules.id, params.id),
    with: { salaryStructure: true },
  });

  if (!rule) {
    return NextResponse.json({ error: 'Salary rule not found' }, { status: 404 });
  }

  return NextResponse.json({ data: rule });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManagePayrollConfig(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: Admin or Payroll Manager required to edit rules' }, { status: 403 });
  }

  const existing = await db.query.salaryRules.findFirst({
    where: eq(salaryRules.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Salary rule not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSalaryRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  // Validate formula syntax and safety
  if (parsed.data.formulaExpression) {
    const code = parsed.data.code || existing.code;
    const valResult = validateFormulaExpression(parsed.data.formulaExpression, code);
    if (!valResult.valid) {
      return NextResponse.json(
        { error: `Formula expression is invalid: ${valResult.error}` },
        { status: 400 }
      );
    }
  }

  const [updated] = await db
    .update(salaryRules)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(salaryRules.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'salaryRules',
    entityId: updated.id,
    action: 'UPDATE',
    changes: { previous: existing, updated },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManagePayrollConfig(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: Admin or Payroll Manager required to delete rules' }, { status: 403 });
  }

  const existing = await db.query.salaryRules.findFirst({
    where: eq(salaryRules.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Salary rule not found' }, { status: 404 });
  }

  await db.delete(salaryRules).where(eq(salaryRules.id, existing.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'salaryRules',
    entityId: params.id,
    action: 'DELETE',
    changes: existing,
  });

  return NextResponse.json({ message: 'Salary rule deleted successfully' });
}
