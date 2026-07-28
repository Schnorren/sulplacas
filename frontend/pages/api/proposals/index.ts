import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { calcPrice, generateProposalCode, logEvent } from '../../../lib/proposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // create proposal
    const body = req.body;
    const { client, lengthM, widthM, clientCity, displacementCostCents = 0, selectedUpsellIds = [], hiddenMarginCents = 0, validityDays = 7 } = body;
    if (!client || !client.name || !client.email) return res.status(400).json({ error: 'Missing client' });

    const areaM2 = parseFloat(((lengthM || 0) * (widthM || 0)).toFixed(2));
    const { upsellTotalCents, totalCashCents, pricing, basePriceCents, excessPriceCents } = await calcPrice(areaM2, displacementCostCents, selectedUpsellIds, hiddenMarginCents);

    const clientDb = await prisma.client.upsert({
      where: { whatsapp: client.whatsapp },
      update: { name: client.name, ...(client.email ? { email: client.email } : {}) },
      create: { name: client.name, whatsapp: client.whatsapp, email: client.email ?? null },
    });

    const proposalCode = await generateProposalCode();

    const proposal = await prisma.proposal.create({
      data: {
        proposalCode,
        clientId: clientDb.id,
        lengthM,
        widthM,
        areaM2,
        clientCity,
        displacementCostCents,
        hiddenMarginCents,
        basePriceCents,
        excessPriceCents,
        totalCashCents,
        selectedUpsellIds,
        upsellTotalCents,
        validityDays,
        expiresAt: new Date(Date.now() + (validityDays * 24 * 60 * 60 * 1000)),
        status: 'SENT',
      },
      include: { client: true },
    });

    await logEvent(proposal.id, 'CREATED', { proposalCode, totalCashCents, clientName: clientDb.name });

    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? process.env.NEXT_PUBLIC_FRONTEND ?? 'http://localhost:3000';
    const whatsapp = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';
    const proposalLink = `${frontendUrl}/proposta/${proposal.id}`;

    return res.status(201).json({ proposalId: proposal.id, proposalCode: proposal.proposalCode, proposalLink, whatsappLink: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Segue sua proposta ${proposal.proposalCode}: ${proposalLink}`)}` });
  }

  if (req.method === 'PUT') {
    // preview pricing
    const { lengthM, widthM, displacementCostCents = 0, selectedUpsellIds = [], hiddenMarginCents = 0 } = req.body;
    const areaM2 = parseFloat(((lengthM || 0) * (widthM || 0)).toFixed(2));
    const { upsellTotalCents, totalCashCents, pricing } = await calcPrice(areaM2, displacementCostCents, selectedUpsellIds, hiddenMarginCents);
    return res.status(200).json({ upsellTotalCents, totalCashCents, pricing });
  }

  return res.status(405).end();
}
