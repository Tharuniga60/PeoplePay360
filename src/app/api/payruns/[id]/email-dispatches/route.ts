import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailDispatches } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { canAccessPayroll } from '@/lib/rbac';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessPayroll(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dispatches = await db.query.emailDispatches.findMany({
    where: and(
      eq(emailDispatches.payrunId, params.id),
      eq(emailDispatches.companyId, session.user.companyId)
    ),
    orderBy: [desc(emailDispatches.createdAt)],
  });

  return NextResponse.json({ data: dispatches });
}
