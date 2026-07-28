import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const counts = await prisma.proposal.groupBy({ by: ['status'], _count: { status: true } });
  const result: Record<string, number> = {};
  for (const c of counts) result[c.status] = c._count.status;
  return res.status(200).json(result);
}
