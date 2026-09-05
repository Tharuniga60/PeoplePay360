import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { salaryRules, salaryStructures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canAccessPayroll, canManagePayrollConfig } from '@/lib/rbac';
import { RuleFormClient } from '../rule-form-client';

export const metadata = {
  title: 'Edit Salary Rule | PeoplePay360',
};

export default async function EditSalaryRulePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role || '';
  if (!canAccessPayroll(role)) {
    redirect('/payroll/payruns');
  }

  const rule = await db.query.salaryRules.findFirst({
    where: eq(salaryRules.id, params.id),
    with: { salaryStructure: true },
  });

  if (!rule) {
    notFound();
  }

  const structures = await db.query.salaryStructures.findMany({
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  const canEdit = canManagePayrollConfig(role);

  return (
    <RuleFormClient
      initialData={rule}
      structures={structures}
      canEdit={canEdit}
      isNew={false}
    />
  );
}
