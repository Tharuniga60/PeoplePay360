import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payruns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (!payrun) return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });

  return NextResponse.json({ data: payrun });
}
