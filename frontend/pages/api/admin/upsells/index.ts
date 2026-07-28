import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method === 'GET') {
    const upsells = await prisma.upsellProduct.findMany({ orderBy: { sortOrder: 'asc' } });
    return res.status(200).json(upsells);
  }
  if (req.method === 'POST') {
    const dto = req.body;
    const created = await prisma.upsellProduct.create({ data: dto });
    return res.status(201).json(created);
  }
  return res.status(405).end();
}
