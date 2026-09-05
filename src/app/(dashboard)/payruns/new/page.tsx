import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { salaryStructures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { WizardPageClient } from './wizard-client';
import { canAccessPayroll } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'New Pay Run' };

export default async function NewPayrunPage() {
  const session = await auth();

  if (!canAccessPayroll(session?.user?.role || '')) {
    redirect('/?error=unauthorized');
  }

  const structures = await db
    .select({ id: salaryStructures.id, name: salaryStructures.name, code: salaryStructures.code })
    .from(salaryStructures)
    .where(eq(salaryStructures.companyId, session!.user.companyId));

  return (
    <WizardPageClient
      salaryStructures={structures}
      companyId={session!.user.companyId}
    />
  );
}
