import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  if (req.method === 'PATCH') {
    const updated = await prisma.proposal.update({ where: { id }, data: { lastContactedAt: new Date() } });
    await prisma.proposalEvent.create({ data: { proposalId: id, type: 'CONTACTED' } as any });
    return res.status(200).json(updated);
  }
  return res.status(405).end();
}
