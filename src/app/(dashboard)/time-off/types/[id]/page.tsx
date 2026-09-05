import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveTypes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import { LeaveTypeFormClient } from '../leave-type-form-client';

export const metadata = {
  title: 'Edit Time Off Type | PeoplePay360',
};

export default async function EditLeaveTypePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  if (!canManageEmployees(session.user.role || '')) {
    redirect('/time-off/requests');
  }

  const type = await db.query.leaveTypes.findFirst({
    where: eq(leaveTypes.id, params.id),
  });

  if (!type) {
    notFound();
  }

  return (
    <LeaveTypeFormClient
      initialData={type}
      companyId={session.user.companyId}
      isNew={false}
    />
  );
}
