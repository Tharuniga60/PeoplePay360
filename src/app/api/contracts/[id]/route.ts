import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { auth } from '@/auth';
import { updateContractSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import { canManageEmployees } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, params.id),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
      salaryStructure: true,
      schedule: true,
    },
  });

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (session.user.role === 'employee' && session.user.employeeId !== contract.employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: contract });
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

  const existing = await db.query.contracts.findFirst({
    where: eq(contracts.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const empId = parsed.data.employeeId || existing.employeeId;
  const targetStatus = parsed.data.status || existing.status;
  const targetStart = parsed.data.startDate || existing.startDate;
  const targetEnd = parsed.data.endDate !== undefined ? parsed.data.endDate : existing.endDate;

  // Validate state machine transitions
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ['active', 'cancelled'],
      active: ['expired', 'cancelled'],
      expired: ['draft'],
      cancelled: ['draft'],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          error: `Invalid contract state transition: Cannot change status from '${existing.status}' to '${parsed.data.status}'. ` +
            (existing.status === 'expired' || existing.status === 'cancelled'
              ? `Reset contract to 'draft' first before activating.`
              : `Allowed transitions: ${allowed.join(', ')}`),
        },
        { status: 400 }
      );
    }
  }

  // If contract is or is becoming active, check overlap with other active contracts
  if (targetStatus === 'active') {
    const otherActive = await db.query.contracts.findMany({
      where: and(
        eq(contracts.employeeId, empId),
        eq(contracts.status, 'active'),
        ne(contracts.id, existing.id)
      ),
    });

    const newStart = new Date(targetStart).getTime();
    const newEnd = targetEnd ? new Date(targetEnd).getTime() : Infinity;

    const hasOverlap = otherActive.some((c) => {
      const cStart = new Date(c.startDate).getTime();
      const cEnd = c.endDate ? new Date(c.endDate).getTime() : Infinity;
      return newStart <= cEnd && newEnd >= cStart;
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Employee already has an active running contract for this timeframe.' },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, any> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  if (parsed.data.wage !== undefined) {
    updateData.wage = parsed.data.wage.toString();
  }

  const [updated] = await db
    .update(contracts)
    .set(updateData)
    .where(eq(contracts.id, existing.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'contracts',
    entityId: updated.id,
    action: 'UPDATE',
    changes: { previous: existing, updated },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageEmployees(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db.query.contracts.findFirst({
    where: eq(contracts.id, params.id),
  });

  if (!existing) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (existing.status === 'active') {
    return NextResponse.json(
      { error: 'Cannot delete an active running contract. Expire or cancel it first.' },
      { status: 400 }
    );
  }

  await db.delete(contracts).where(eq(contracts.id, existing.id));

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'contracts',
    entityId: existing.id,
    action: 'DELETE',
    changes: existing,
  });

  return NextResponse.json({ message: 'Contract deleted successfully' });
}
