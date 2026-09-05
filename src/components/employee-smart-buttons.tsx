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
  allocationCount?: number;
}

export function EmployeeSmartButtons({
  employeeId,
  contractCount,
  attendanceCount,
  leaveBalance,
  payslipCount,
  allocationCount = 0,
}: EmployeeSmartButtonsProps) {
  const buttons: SmartButton[] = [
    {
      label: 'Contracts',
      description: contractCount > 0 ? `${contractCount} Active` : '0 Active',
      count: contractCount,
      href: `/contracts?employee_id=${employeeId}`,
      icon: FileText,
      color: contractCount > 0 ? 'text-emerald-400' : 'text-yellow-400',
      bg: contractCount > 0 ? 'bg-emerald-500/10 border-emerald-800/40' : 'bg-yellow-500/10 border-yellow-800/40',
    },
    {
      label: 'Attendance',
      description: `${attendanceCount} Days Logged`,
      count: attendanceCount,
      href: `/attendance?employee_id=${employeeId}`,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-800/40',
    },
    {
      label: 'Time Off',
      description: `${leaveBalance}d Left`,
      count: leaveBalance,
      href: `/time-off/requests?employee_id=${employeeId}`,
      icon: Calendar,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-800/40',
    },
    {
      label: 'Allocations',
      description: `${allocationCount} Records`,
      count: allocationCount,
      href: `/time-off/allocations?employee_id=${employeeId}`,
      icon: Calendar,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-800/40',
    },
    {
      label: 'Payslips',
      description: `${payslipCount} Issued`,
      count: payslipCount,
      href: `/payroll/payslips?employee_id=${employeeId}`,
      icon: Receipt,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {buttons.map((btn) => (
        <Link
          key={btn.label}
          href={btn.href}
          className={cn(
            'flex items-center justify-between p-3.5 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg',
            btn.bg
          )}
        >
          <div className="flex items-center gap-3">
            <btn.icon className={cn('w-5 h-5 flex-shrink-0', btn.color)} />
            <div>
              <p className="text-xs font-semibold text-white">{btn.label}</p>
              <p className={cn('text-xs font-medium mt-0.5', btn.color)}>
                {btn.description}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#4b5563]" />
        </Link>
      ))}
    </div>
  );
}
