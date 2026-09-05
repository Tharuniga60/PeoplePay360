'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn, getInitials, snakeToTitle } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  LogOut,
  ChevronRight,
  ChevronDown,
  Building2,
  Clock,
  Settings,
  CalendarDays,
  BookOpen,
  Sliders,
  BarChart3,
} from 'lucide-react';
import { canComputePayrun, canManageEmployees } from '@/lib/rbac';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';
  const employeeId = session?.user?.employeeId ?? null;

  const isTimeOffActive = pathname.startsWith('/time-off') || pathname.startsWith('/leaves') || pathname.startsWith('/leave-allocations');
  const isPayrollActive = pathname.startsWith('/payroll') || pathname.startsWith('/payruns') || pathname.startsWith('/payslips') || pathname.startsWith('/salary-structures');

  const [timeOffOpen, setTimeOffOpen] = useState(isTimeOffActive);
  const [payrollOpen, setPayrollOpen] = useState(isPayrollActive);

  // Keep dropdowns open if navigating to one of their routes
  useEffect(() => {
    if (isTimeOffActive) setTimeOffOpen(true);
    if (isPayrollActive) setPayrollOpen(true);
  }, [isTimeOffActive, isPayrollActive]);

  const isManager = canManageEmployees(role);
  const canCompute = canComputePayrun(role);

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#0d0f14] border-r border-[#1e2235] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1e2235]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#3b6ef0] shadow-lg shadow-blue-500/25">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-white font-semibold text-sm tracking-tight">PeoplePay360</span>
          <p className="text-[10px] text-[#4b5563] leading-tight">HR & Payroll Platform</p>
        </div>
      </div>

      {/* Company Chip */}
      <div className="mx-3 mt-4 px-3 py-2.5 bg-[#1a1d26] rounded-lg border border-[#2a2d3e] flex items-center gap-2.5">
        <Building2 className="w-4 h-4 text-[#3b6ef0] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#e2e8f0] truncate">Acme Corp</p>
          <p className="text-[10px] text-[#4b5563]">Bengaluru HQ</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-1.5 overflow-y-auto">
        {/* Core Overview */}
        <Link
          href="/"
          className={cn('sidebar-link', pathname === '/' && 'active')}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Overview</span>
        </Link>

        {/* Employees */}
        {isManager ? (
          <Link
            href="/employees"
            className={cn('sidebar-link', pathname.startsWith('/employees') && 'active')}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Employees</span>
          </Link>
        ) : employeeId ? (
          <Link
            href={`/employees/${employeeId}`}
            className={cn('sidebar-link', pathname.startsWith('/employees') && 'active')}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">My Profile</span>
          </Link>
        ) : null}

        {/* Contracts */}
        <Link
          href="/contracts"
          className={cn('sidebar-link', pathname.startsWith('/contracts') && 'active')}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Contracts</span>
        </Link>

        {/* Attendance */}
        <Link
          href="/attendance"
          className={cn('sidebar-link', pathname.startsWith('/attendance') && 'active')}
        >
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Attendance</span>
        </Link>

        {/* Time Off Dropdown */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setTimeOffOpen(!timeOffOpen)}
            className={cn(
              'sidebar-link w-full text-left justify-between',
              isTimeOffActive && 'text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Time Off</span>
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[#6b7280] transition-transform duration-200',
                timeOffOpen && 'rotate-180 text-white'
              )}
            />
          </button>

          {timeOffOpen && (
            <div className="pl-7 pr-1 mt-1 space-y-0.5 animate-fade-in border-l border-[#1e2235] ml-4">
              <Link
                href="/time-off/requests"
                className={cn(
                  'sidebar-link text-xs py-1.5',
                  (pathname.startsWith('/time-off/requests') || pathname.startsWith('/leaves')) && 'active'
                )}
              >
                Time Off Requests
              </Link>
              <Link
                href="/time-off/allocations"
                className={cn(
                  'sidebar-link text-xs py-1.5',
                  (pathname.startsWith('/time-off/allocations') || pathname.startsWith('/leave-allocations')) && 'active'
                )}
              >
                Leave Allocations
              </Link>
              {isManager && (
                <Link
                  href="/time-off/types"
                  className={cn(
                    'sidebar-link text-xs py-1.5',
                    pathname.startsWith('/time-off/types') && 'active'
                  )}
                >
                  Configuration Types
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Payroll Dropdown */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setPayrollOpen(!payrollOpen)}
            className={cn(
              'sidebar-link w-full text-left justify-between',
              isPayrollActive && 'text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>Payroll</span>
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[#6b7280] transition-transform duration-200',
                payrollOpen && 'rotate-180 text-white'
              )}
            />
          </button>

          {payrollOpen && (
            <div className="pl-7 pr-1 mt-1 space-y-0.5 animate-fade-in border-l border-[#1e2235] ml-4">
              {canCompute && (
                <Link
                  href="/payroll/payruns"
                  className={cn(
                    'sidebar-link text-xs py-1.5',
                    (pathname.startsWith('/payroll/payruns') || pathname.startsWith('/payruns')) && 'active'
                  )}
                >
                  Payruns
                </Link>
              )}
              <Link
                href="/payroll/payslips"
                className={cn(
                  'sidebar-link text-xs py-1.5',
                  (pathname.startsWith('/payroll/payslips') || pathname.startsWith('/payslips')) && 'active'
                )}
              >
                Payslips
              </Link>
              {canCompute && (
                <>
                  <Link
                    href="/payroll/structures"
                    className={cn(
                      'sidebar-link text-xs py-1.5',
                      (pathname.startsWith('/payroll/structures') || pathname.startsWith('/salary-structures')) && 'active'
                    )}
                  >
                    Salary Structures
                  </Link>
                  <Link
                    href="/payroll/rules"
                    className={cn(
                      'sidebar-link text-xs py-1.5',
                      pathname.startsWith('/payroll/rules') && 'active'
                    )}
                  >
                    Salary Rules
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reports */}
        {canCompute && (
          <Link
            href="/reports/dashboard"
            className={cn('sidebar-link', pathname.startsWith('/reports') && 'active')}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Reports</span>
          </Link>
        )}

        {/* Working Schedules */}
        {isManager && (
          <Link
            href="/working-schedules"
            className={cn('sidebar-link', pathname.startsWith('/working-schedules') && 'active')}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Working Schedules</span>
          </Link>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-[#1e2235]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[#141720]">
          <div className="w-8 h-8 rounded-full bg-[#3b6ef0]/20 flex items-center justify-center text-[#3b6ef0] text-xs font-bold flex-shrink-0">
            {session?.user?.name ? getInitials(session.user.name.split(' ')[0], session.user.name.split(' ')[1] ?? '') : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{session?.user?.name ?? 'User'}</p>
            <p className="text-[10px] text-[#4b5563] truncate capitalize">{snakeToTitle(role)}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className="p-1.5 rounded-lg text-[#4b5563] hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
