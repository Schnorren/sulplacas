import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { key } = req.query as { key: string };
  if (req.method === 'PATCH') {
    const { value } = req.body;
    const result = await prisma.pricingConfig.upsert({ where: { key }, update: { value }, create: { key, value, label: key } });
    return res.status(200).json(result);
  }
  return res.status(405).end();
}
