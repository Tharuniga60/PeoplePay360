import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewStructureClient } from './new-structure-client';

export default async function NewSalaryStructurePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  if (!['admin', 'hr_payroll_manager'].includes(role)) {
    redirect('/salary-structures');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/salary-structures" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Salary Structures
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Salary Structure</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Define a new payroll computation structure. Add salary rules after creating the structure.</p>
      </div>
      <NewStructureClient companyId={session.user.companyId} />
    </div>
  );
}
