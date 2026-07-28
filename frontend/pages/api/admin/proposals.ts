import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from './_auth';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method === 'GET') {
    const { search, status, dateRange, orderBy = 'createdAt', orderDir = 'desc' } = req.query as any;
    const where: any = {};
    if (search) {
      const q = String(search).trim();
      where.OR = [ { proposalCode: { contains: q, mode: 'insensitive' } }, { clientCity: { contains: q, mode: 'insensitive' } }, { client: { name: { contains: q, mode: 'insensitive' } } }, { client: { whatsapp: { contains: q, mode: 'insensitive' } } }, { client: { email: { contains: q, mode: 'insensitive' } } } ];
    }
    if (status && status !== 'ALL') where.status = status;
    if (dateRange) {
      const start = new Date();
      if (dateRange === 'today') start.setHours(0,0,0,0);
      else if (dateRange === 'week') start.setDate(start.getDate()-7);
      else if (dateRange === 'month') start.setDate(start.getDate()-30);
      where.createdAt = { gte: start };
    }
    const list = await prisma.proposal.findMany({ where, include: { client: true }, orderBy: { [orderBy]: orderDir } });
    return res.status(200).json(list);
  }
  return res.status(405).end();
}
