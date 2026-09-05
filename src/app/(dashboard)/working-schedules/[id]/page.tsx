import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { workingSchedules, employees } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import { ScheduleDetailClient } from './schedule-detail-client';

export const metadata = {
  title: 'Working Schedule Details | PeoplePay360',
};

export default async function WorkingScheduleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const schedule = await db.query.workingSchedules.findFirst({
    where: eq(workingSchedules.id, params.id),
    with: {
      scheduleLines: true,
    },
  });

  if (!schedule) {
    notFound();
  }

  const role = session.user.role || '';
  const canManage = canManageEmployees(role);

  const allEmployees = await db.query.employees.findMany({
    where: eq(employees.companyId, session.user.companyId),
    with: {
      department: true,
      jobPosition: true,
      defaultSchedule: true,
    },
    orderBy: [asc(employees.firstName), asc(employees.lastName)],
  });

  return (
    <ScheduleDetailClient
      schedule={schedule}
      allEmployees={allEmployees}
      canManage={canManage}
    />
  );
}
