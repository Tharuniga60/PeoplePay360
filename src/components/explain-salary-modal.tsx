'use client';

import { useState } from 'react';
import { X, Code2, Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface CalculationTrace {
  ruleCode: string;
  ruleName: string;
  sequence: number;
  category: string;
  formula: string;
  conditionExpression: string;
  conditionResult: boolean;
  resolvedVariables: Record<string, unknown>;
  computedAmount: number;
  skipped: boolean;
  skipReason?: string;
}

interface PayslipLine {
  id: string;
  sequence: number;
  code: string;
  name: string;
  category: string;
  amount: string;
  calculationTrace: CalculationTrace;
}

interface ExplainSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  lines: PayslipLine[];
}

const CATEGORY_COLORS: Record<string, string> = {
  BASIC: 'text-blue-400 bg-blue-500/10 border-blue-800/40',
  ALW: 'text-purple-400 bg-purple-500/10 border-purple-800/40',
  GROSS: 'text-emerald-400 bg-emerald-500/10 border-emerald-800/40',
  DED: 'text-red-400 bg-red-500/10 border-red-800/40',
  NET: 'text-yellow-400 bg-yellow-500/10 border-yellow-800/40',
  OTHER: 'text-gray-400 bg-gray-500/10 border-gray-800/40',
};

function TraceRow({ line }: { line: PayslipLine }) {
  const [expanded, setExpanded] = useState(false);
  const trace = line.calculationTrace;

  return (
    <div className="border border-[#2a2d3e] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1e2235] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-6 h-6 rounded flex items-center justify-center bg-[#111318] text-xs font-mono text-[#4b5563] flex-shrink-0">
          {line.sequence}
        </span>
        <span className={cn('badge text-xs border', CATEGORY_COLORS[line.category])}>
          {line.category}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">{line.name}</span>
          {trace.skipped && (
            <span className="ml-2 text-xs text-[#4b5563]">(skipped)</span>
          )}
        </div>
        <span className={cn(
          'font-mono text-sm font-semibold',
          trace.skipped ? 'text-[#374151]' : parseFloat(line.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {trace.skipped ? '—' : formatCurrency(parseFloat(line.amount))}
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-[#4b5563]" /> : <ChevronRight className="w-4 h-4 text-[#4b5563]" />}
      </div>

      {expanded && (
        <div className="border-t border-[#2a2d3e] bg-[#111318] px-4 py-3 space-y-3 text-xs">
          <div className="flex items-start gap-2">
            <Code2 className="w-3.5 h-3.5 text-[#3b6ef0] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[#4b5563] font-medium mb-0.5">Formula</p>
              <code className="text-[#e2e8f0] font-mono bg-[#1a1d26] px-2 py-0.5 rounded">{trace.formula}</code>
            </div>
          </div>

          {trace.conditionExpression !== 'true' && (
            <div className="flex items-start gap-2">
              <Calculator className="w-3.5 h-3.5 text-[#6b7280] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[#4b5563] font-medium mb-0.5">Condition</p>
                <code className="text-[#e2e8f0] font-mono bg-[#1a1d26] px-2 py-0.5 rounded">{trace.conditionExpression}</code>
                <span className={cn('ml-2', trace.conditionResult ? 'text-emerald-400' : 'text-red-400')}>
                  → {String(trace.conditionResult)}
                </span>
              </div>
            </div>
          )}

          {trace.skipReason && (
            <p className="text-yellow-400 bg-yellow-500/10 border border-yellow-800/40 rounded px-2 py-1">
              Skipped: {trace.skipReason}
            </p>
          )}

          {/* Key Variables */}
          <div>
            <p className="text-[#4b5563] font-medium mb-1.5">Resolved Variables</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(trace.resolvedVariables)
                .filter(([k]) => !k.startsWith('categories.') || ['categories.BASIC','categories.ALW','categories.GROSS'].includes(k))
                .slice(0, 12)
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between bg-[#1a1d26] rounded px-2 py-1">
                    <span className="text-[#6b7280] font-mono">{key}</span>
                    <span className="text-[#e2e8f0] font-mono font-medium">
                      {typeof val === 'number' ? val.toFixed(2) : String(val)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExplainSalaryModal({ isOpen, onClose, employeeName, lines }: ExplainSalaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#1a1d26] rounded-2xl border border-[#2a2d3e] shadow-2xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3e] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Salary Calculation Trace</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">{employeeName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#111318] transition-colors text-[#4b5563] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {lines.map((line) => (
            <TraceRow key={line.id} line={line} />
          ))}
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-4 border-t border-[#2a2d3e] flex-shrink-0">
          {(() => {
            const net = lines.find((l) => l.category === 'NET' && !l.calculationTrace.skipped);
            return net ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7280]">Net Pay</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(parseFloat(net.amount))}</span>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
