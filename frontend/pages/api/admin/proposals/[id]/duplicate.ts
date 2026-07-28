import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../_auth';
import { prisma } from '../../../../../lib/prisma';
import { generateProposalCode } from '../../../../../lib/proposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const { id } = req.query as { id: string };
  if (req.method === 'POST') {
    const original = await prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!original) return res.status(404).json({ error: 'Proposta não encontrada' });
    const proposalCode = await generateProposalCode();
    const validityDays = original.validityDays ?? 7;
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + validityDays);
    const copy = await prisma.proposal.create({ data: { proposalCode, clientId: original.clientId, lengthM: original.lengthM, widthM: original.widthM, areaM2: original.areaM2, clientCity: original.clientCity, displacementCostCents: original.displacementCostCents, hiddenMarginCents: original.hiddenMarginCents, basePriceCents: original.basePriceCents, excessPriceCents: original.excessPriceCents, totalCashCents: original.totalCashCents, selectedUpsellIds: original.selectedUpsellIds, upsellTotalCents: original.upsellTotalCents, validityDays, expiresAt, status: 'SENT' }, include: { client: true } });
    await prisma.proposalEvent.create({ data: { proposalId: copy.id, type: 'CREATED', payload: { proposalCode, duplicatedFrom: original.proposalCode } } as any });
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
    const whatsapp = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';
    const proposalLink = `${frontendUrl}/proposta/${copy.id}`;
    return res.status(201).json({ proposalId: copy.id, proposalCode: copy.proposalCode, proposalLink, whatsappLink: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Segue sua proposta ${copy.proposalCode}: ${proposalLink}`)}` });
  }
  return res.status(405).end();
}
