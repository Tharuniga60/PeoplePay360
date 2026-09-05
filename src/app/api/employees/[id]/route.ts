import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { updateEmployeeSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canManageEmployees } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, params.id),
    with: {
      department: true,
      jobPosition: true,
      branch: true,
      defaultSchedule: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (session.user.role === 'employee' && session.user.employeeId !== employee.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: employee });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.employees.findFirst({
    where: eq(employees.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const [updated] = await db
    .update(employees)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'employees',
    entityId: updated.id,
    action: 'UPDATE',
    changes: { previous: existing, updated },
  });

  return NextResponse.json({ data: updated });
}
