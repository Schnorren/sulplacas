import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';

const VALID_STATUSES = ['DRAFT','SENT','VIEWED','APPROVED','EXPIRED','NEGOTIATING','LOST'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  if (req.method === 'PATCH') {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
    const updated = await prisma.proposal.update({ where: { id }, data: { status } as any });
    await prisma.proposalEvent.create({ data: { proposalId: id, type: 'STATUS_CHANGED', payload: { from: proposal.status, to: status } } as any });
    return res.status(200).json(updated);
  }
  return res.status(405).end();
}
