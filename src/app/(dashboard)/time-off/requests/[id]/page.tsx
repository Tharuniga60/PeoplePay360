import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canApproveLeave } from '@/lib/rbac';
import { RequestDetailClient } from './request-detail-client';

export const metadata = {
  title: 'Time Off Request Details | PeoplePay360',
};

export default async function TimeOffRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, params.id),
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

  if (!request) {
    notFound();
  }

  const role = session.user.role || '';
  if (role === 'employee' && session.user.employeeId !== request.employeeId) {
    redirect('/time-off/requests');
  }

  const canApprove = canApproveLeave(role);

  return <RequestDetailClient request={request} canApprove={canApprove} />;
}
