import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from './_auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const search = (req.query.search as string) || undefined;
  const where: any = {};
  if (search) {
    const q = search.trim();
    where.OR = [ { name: { contains: q, mode: 'insensitive' } }, { whatsapp: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ];
  }
  const clients = await prisma.client.findMany({ where, include: { proposals: { orderBy: { createdAt: 'desc' }, select: { id: true, proposalCode: true, status: true, totalCashCents: true, createdAt: true, areaM2: true, clientCity: true, lastViewedAt: true } } }, orderBy: { createdAt: 'desc' } });
  const mapped = clients.map((c) => ({ ...c, totalProposals: c.proposals.length, totalApproved: c.proposals.filter((p:any)=>p.status==='APPROVED').length, totalValueCents: c.proposals.reduce((s:any,p:any)=>s+p.totalCashCents,0), lastActivity: c.proposals[0]?.createdAt ?? c.createdAt, hasHot: c.proposals.some((p:any)=>p.status==='VIEWED' && p.lastViewedAt && Date.now() - new Date(p.lastViewedAt).getTime() < 48*3600000) }));
  return res.status(200).json(mapped);
}
