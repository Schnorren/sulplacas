import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  if (req.method === 'PATCH') {
    const dto = req.body;
    const updated = await prisma.upsellProduct.update({ where: { id }, data: dto });
    return res.status(200).json(updated);
  }
  if (req.method === 'DELETE') {
    await prisma.upsellProduct.delete({ where: { id } });
    return res.status(204).end();
  }
  return res.status(405).end();
}
