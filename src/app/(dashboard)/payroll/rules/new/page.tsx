import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { salaryStructures } from '@/db/schema';
import { canManagePayrollConfig } from '@/lib/rbac';
import { RuleFormClient } from '../rule-form-client';

export const metadata = {
  title: 'New Salary Rule | PeoplePay360',
};

export default async function NewSalaryRulePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role || '';
  if (!canManagePayrollConfig(role)) {
    redirect('/payroll/rules');
  }

  const structures = await db.query.salaryStructures.findMany({
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  return (
    <RuleFormClient
      structures={structures}
      canEdit={true}
      isNew={true}
    />
  );
}
