import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { assertCanAccessPayslip } from '@/lib/rbac';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payslip = await db.query.payslips.findFirst({
    where: eq(payslips.id, params.id),
    with: {
      employee: {
        with: { department: true, jobPosition: true, branch: true },
      },
      contract: { with: { salaryStructure: true } },
      payrun: true,
      lines: { orderBy: (l, { asc }) => [asc(l.sequence)] },
    },
  });

  if (!payslip) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

  // RBAC: employees can only access their own payslip
  if (!assertCanAccessPayslip(session, payslip.employeeId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({ data: payslip });
}
