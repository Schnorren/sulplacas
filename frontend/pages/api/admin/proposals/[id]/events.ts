import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  const events = await prisma.proposalEvent.findMany({ where: { proposalId: id }, orderBy: { createdAt: 'desc' } });
  return res.status(200).json(events);
}
