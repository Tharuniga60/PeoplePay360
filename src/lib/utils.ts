import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return '—';
  }
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

export const PAYRUN_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-elevated text-muted-foreground border border-border',
  computed: 'bg-info/10 text-blue-400 border border-blue-800/40',
  validated: 'bg-warning/10 text-yellow-400 border border-yellow-800/40',
  approved: 'bg-success/10 text-emerald-400 border border-emerald-800/40',
  paid: 'bg-success/20 text-emerald-300 border border-emerald-700/50',
  cancelled: 'bg-danger/10 text-red-400 border border-red-800/40',
};

export const ANOMALY_SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-info/10 text-blue-400 border border-blue-800/40',
  warning: 'bg-warning/10 text-yellow-400 border border-yellow-800/40',
  critical: 'bg-danger/10 text-red-400 border border-red-800/40',
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-elevated text-muted-foreground border border-border',
  active: 'bg-success/10 text-emerald-400 border border-emerald-800/40',
  expired: 'bg-danger/10 text-red-400 border border-red-800/40',
  cancelled: 'bg-surface-elevated text-muted-foreground border border-border',
};

export const LEAVE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-elevated text-muted-foreground border border-border',
  pending: 'bg-warning/10 text-yellow-400 border border-yellow-800/40',
  approved: 'bg-success/10 text-emerald-400 border border-emerald-800/40',
  rejected: 'bg-danger/10 text-red-400 border border-red-800/40',
  cancelled: 'bg-surface-elevated text-muted-foreground border border-border',
};
