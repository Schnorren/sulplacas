import type { NextApiRequest, NextApiResponse } from 'next';
import { calcPrice } from '../../../lib/proposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { lengthM, widthM, displacementCostCents = 0, selectedUpsellIds = [], hiddenMarginCents = 0 } = req.body;
  const areaM2 = parseFloat(((lengthM || 0) * (widthM || 0)).toFixed(2));
  const { pricing, upsellTotalCents, totalCashCents } = await calcPrice(areaM2, displacementCostCents, selectedUpsellIds, hiddenMarginCents);
  return res.status(200).json({ areaM2, pricing, upsellTotalCents, totalCashCents });
}
