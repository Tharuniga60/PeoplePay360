'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PayrunWizardStep1, type CandidateResult } from '@/components/payrun-wizard-step1';
import { PayrunWizardStep2 } from '@/components/payrun-wizard-step2';

interface SalaryStructure {
  id: string;
  name: string;
  code: string;
}

interface WizardPageClientProps {
  salaryStructures: SalaryStructure[];
  companyId: string;
}

interface Step1Data {
  periodStart: string;
  periodEnd: string;
  salaryStructureId: string;
  candidates: CandidateResult[];
}

export function WizardPageClient({ salaryStructures, companyId }: WizardPageClientProps) {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/payruns" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Pay Runs
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Pay Run</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Complete both steps to create a draft payrun</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: 'Scope & Period' },
          { num: 2, label: 'Select Employees' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                step === s.num
                  ? 'bg-[#3b6ef0] border-[#3b6ef0] text-white'
                  : step > s.num
                  ? 'bg-emerald-500/20 border-emerald-800/40 text-emerald-400'
                  : 'bg-[#1e2235] border-[#2a2d3e] text-[#4b5563]'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-sm font-medium ${step === s.num ? 'text-white' : 'text-[#4b5563]'}`}>
                {s.label}
              </span>
            </div>
            {i < 1 && <div className="flex-1 h-px bg-[#2a2d3e] min-w-8" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <PayrunWizardStep1
          salaryStructures={salaryStructures}
          companyId={companyId}
          onNext={(data) => {
            setStep1Data(data);
            setStep(2);
          }}
        />
      )}

      {step === 2 && step1Data && (
        <PayrunWizardStep2
          {...step1Data}
          companyId={companyId}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}
