'use client';

import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Anomaly {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  anomalyType: string;
  message: string;
  details?: Record<string, unknown>;
  employee?: { firstName: string; lastName: string; employeeCode: string };
  isResolved: boolean;
}

interface AnomalyBannerProps {
  anomalies: Anomaly[];
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-500/10 border-red-800/40',
    text: 'text-red-400',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/10 border-yellow-800/40',
    text: 'text-yellow-400',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/10 border-blue-800/40',
    text: 'text-blue-400',
    label: 'Info',
  },
};

export function AnomalyBanner({ anomalies }: AnomalyBannerProps) {
  const active = anomalies.filter((a) => !a.isResolved);
  if (active.length === 0) return null;

  const critical = active.filter((a) => a.severity === 'critical');
  const warnings = active.filter((a) => a.severity === 'warning');
  const infos = active.filter((a) => a.severity === 'info');

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-xl border text-sm',
        critical.length > 0 ? 'bg-red-500/10 border-red-800/40' : 'bg-yellow-500/10 border-yellow-800/40'
      )}>
        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', critical.length > 0 ? 'text-red-400' : 'text-yellow-400')} />
        <span className={critical.length > 0 ? 'text-red-300' : 'text-yellow-300'}>
          <strong>{active.length} anomaly/ies detected</strong> — 
          {critical.length > 0 && ` ${critical.length} critical`}
          {warnings.length > 0 && ` · ${warnings.length} warnings`}
          {infos.length > 0 && ` · ${infos.length} info`}
        </span>
      </div>

      {/* Individual Anomalies */}
      <div className="space-y-2">
        {active.map((anomaly) => {
          const cfg = SEVERITY_CONFIG[anomaly.severity];
          return (
            <div key={anomaly.id} className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border', cfg.bg)}>
              <cfg.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.text)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.text)}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-mono text-[#4b5563]">{anomaly.anomalyType}</span>
                  {anomaly.employee && (
                    <span className="text-xs text-[#6b7280]">
                      · {anomaly.employee.firstName} {anomaly.employee.lastName} ({anomaly.employee.employeeCode})
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#e2e8f0] mt-0.5">{anomaly.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
