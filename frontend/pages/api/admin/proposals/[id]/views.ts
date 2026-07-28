import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  const views = await prisma.proposalView.findMany({ where: { proposalId: id }, orderBy: { viewedAt: 'desc' } });
  return res.status(200).json(views);
}
