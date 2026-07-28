import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method === 'GET') {
    const configs = await prisma.pricingConfig.findMany({ orderBy: { key: 'asc' } });
    return res.status(200).json(configs);
  }
  return res.status(405).end();
}
