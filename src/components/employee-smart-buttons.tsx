'use client';

import Link from 'next/link';
import { FileText, Clock, Calendar, Receipt, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartButton {
  label: string;
  description: string;
  count: number | null;
  href: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface EmployeeSmartButtonsProps {
  employeeId: string;
  contractCount: number;
  attendanceCount: number;
  leaveBalance: number;
  payslipCount: number;
}

export function EmployeeSmartButtons({
  employeeId,
  contractCount,
  attendanceCount,
  leaveBalance,
  payslipCount,
}: EmployeeSmartButtonsProps) {
  const buttons: SmartButton[] = [
    {
      label: 'Contract',
      description: contractCount > 0 ? `${contractCount} contract(s)` : 'No active contract',
      count: contractCount,
      href: `/employees/${employeeId}?tab=contract`,
      icon: FileText,
      color: contractCount > 0 ? 'text-emerald-400' : 'text-red-400',
      bg: contractCount > 0 ? 'bg-emerald-500/10 border-emerald-800/40' : 'bg-red-500/10 border-red-800/40',
    },
    {
      label: 'Attendance',
      description: `${attendanceCount} records`,
      count: attendanceCount,
      href: `/employees/${employeeId}?tab=attendance`,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-800/40',
    },
    {
      label: 'Leave Balance',
      description: `${leaveBalance} days remaining`,
      count: leaveBalance,
      href: `/employees/${employeeId}?tab=leaves`,
      icon: Calendar,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-800/40',
    },
    {
      label: 'Payslips',
      description: `${payslipCount} payslip(s)`,
      count: payslipCount,
      href: `/employees/${employeeId}?tab=payslips`,
      icon: Receipt,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {buttons.map((btn) => (
        <Link
          key={btn.label}
          href={btn.href}
          className={cn(
            'section-card p-4 hover:border-[#3b6ef0]/40 transition-all duration-200 group',
            'relative overflow-hidden'
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn('p-2 rounded-lg border', btn.bg)}>
              <btn.icon className={cn('w-4 h-4', btn.color)} />
            </div>
            <ChevronRight className="w-4 h-4 text-[#374151] group-hover:text-[#6b7280] transition-colors" />
          </div>
          <p className="text-xl font-bold text-white">{btn.count ?? '—'}</p>
          <p className="text-sm font-medium text-[#e2e8f0] mt-0.5">{btn.label}</p>
          <p className="text-xs text-[#4b5563] mt-0.5">{btn.description}</p>
        </Link>
      ))}
    </div>
  );
}
