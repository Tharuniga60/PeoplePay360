import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { payruns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PayrunDetailClient } from './payrun-detail-client';

export const metadata: Metadata = { title: 'Pay Run Details' };

export default async function PayrunDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const payrun = await db.query.payruns.findFirst({
    where: eq(payruns.id, params.id),
    with: {
      salaryStructure: true,
      payslips: {
        with: {
          employee: true,
          lines: { orderBy: (l, { asc }) => [asc(l.sequence)] },
        },
      },
      anomalies: {
        with: { employee: true },
        orderBy: (a, { desc }) => [desc(a.severity)],
      },
    },
  });

  if (!payrun || payrun.companyId !== session!.user.companyId) notFound();

  return (
    <PayrunDetailClient
      payrun={payrun as Parameters<typeof PayrunDetailClient>[0]['payrun']}
      userRole={session!.user.role}
    />
  );
}
