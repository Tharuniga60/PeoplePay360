import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveAllocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canApproveLeave } from '@/lib/rbac';
import { AllocationDetailClient } from './allocation-detail-client';

export const metadata = {
  title: 'Leave Allocation Details | PeoplePay360',
};

export default async function LeaveAllocationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const allocation = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.id, params.id),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
      leaveType: true,
    },
  });

  if (!allocation) {
    notFound();
  }

  const role = session.user.role || '';
  if (role === 'employee' && session.user.employeeId !== allocation.employeeId) {
    redirect('/time-off/allocations');
  }

  const canManage = canApproveLeave(role);

  return <AllocationDetailClient allocation={allocation} canManage={canManage} />;
}
