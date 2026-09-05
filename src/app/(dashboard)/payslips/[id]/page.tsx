import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { payslips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { assertCanAccessPayslip } from '@/lib/rbac';
import { PayslipViewerClient } from './payslip-viewer-client';

export const metadata: Metadata = { title: 'Payslip' };

export default async function PayslipPage({ params }: { params: { id: string } }) {
  const session = await auth();

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

  if (!payslip) notFound();
  if (!assertCanAccessPayslip(session!, payslip.employeeId)) notFound();

  return <PayslipViewerClient payslip={payslip as Parameters<typeof PayslipViewerClient>[0]['payslip']} />;
}
