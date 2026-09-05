import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { contracts, salaryStructures, workingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import { ContractDetailClient } from './contract-detail-client';

export const metadata = {
  title: 'Contract Details | PeoplePay360',
};

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

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
    notFound();
  }

  const role = session.user.role || '';
  if (role === 'employee' && session.user.employeeId !== contract.employeeId) {
    redirect('/contracts');
  }

  const structures = await db.query.salaryStructures.findMany({
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  const schedules = await db.query.workingSchedules.findMany({
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  const canEdit = canManageEmployees(role);

  return (
    <ContractDetailClient
      contract={contract}
      salaryStructures={structures}
      schedules={schedules}
      canEdit={canEdit}
    />
  );
}
