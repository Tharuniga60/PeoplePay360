'use client';

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
  Bell,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, exact: true },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Leaves', href: '/leaves', icon: Calendar },
  { label: 'Pay Runs', href: '/payruns', icon: DollarSign },
  { label: 'Payslips', href: '/payslips', icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
      <nav className="flex-1 px-3 mt-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-[#374151] uppercase tracking-widest">Main Menu</p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#3b6ef0]" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-[#1e2235]">
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a1d26] border border-[#2a2d3e] mb-2">
            <div className="w-8 h-8 rounded-full bg-[#3b6ef0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(
                session.user.email?.split('@')[0]?.split('.')[0] ?? 'U',
                session.user.email?.split('@')[0]?.split('.')[1] ?? 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#e2e8f0] truncate">{session.user.email}</p>
              <p className="text-[10px] text-[#3b6ef0] capitalize">{snakeToTitle(session.user.role)}</p>
            </div>
            <Bell className="w-3.5 h-3.5 text-[#4b5563] flex-shrink-0" />
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-link w-full text-red-500/80 hover:text-red-400 hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
