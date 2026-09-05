import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { canManageEmployees } from '@/lib/rbac';
import { LeaveTypeFormClient } from '../leave-type-form-client';

export const metadata = {
  title: 'New Time Off Type | PeoplePay360',
};

export default async function NewLeaveTypePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  if (!canManageEmployees(session.user.role || '')) {
    redirect('/time-off/requests');
  }

  return (
    <LeaveTypeFormClient companyId={session.user.companyId} isNew={true} />
  );
}
