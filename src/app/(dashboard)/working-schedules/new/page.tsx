import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewScheduleClient } from './new-schedule-client';

export default async function NewWorkingSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  if (!['admin', 'hr_manager', 'hr_payroll_manager'].includes(role)) {
    redirect('/working-schedules');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/working-schedules" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Working Schedules
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Working Schedule</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Define a working schedule with daily hours. Schedule lines can be added after creation.</p>
      </div>
      <NewScheduleClient companyId={session.user.companyId} />
    </div>
  );
}
