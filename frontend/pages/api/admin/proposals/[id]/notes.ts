import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  if (req.method === 'PATCH') {
    const { notes } = req.body;
    const proposal = await prisma.proposal.update({ where: { id }, data: { internalNotes: notes } });
    await prisma.proposalEvent.create({ data: { proposalId: id, type: 'NOTES_UPDATED', payload: { preview: String(notes).slice(0,80) } } as any });
    return res.status(200).json(proposal);
  }
  return res.status(405).end();
}
