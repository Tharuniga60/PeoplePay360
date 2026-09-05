import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import { AttendanceDetailClient } from './attendance-detail-client';

export const metadata = {
  title: 'Attendance Record Details | PeoplePay360',
};

export default async function AttendanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const record = await db.query.attendances.findFirst({
    where: eq(attendances.id, params.id),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
    },
  });

  if (!record) {
    notFound();
  }

  const role = session.user.role || '';
  if (role === 'employee' && session.user.employeeId !== record.employeeId) {
    redirect('/attendance');
  }

  const canManage = canManageEmployees(role);

  return <AttendanceDetailClient record={record} canManage={canManage} />;
}
