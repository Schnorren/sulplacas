import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../_auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  const days = parseInt((req.query.days as string) || '2', 10);
  // reuse backend logic: find proposals needing followup
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const proposals = await prisma.proposal.findMany({ where: { status: { in: ['VIEWED', 'NEGOTIATING'] }, lastViewedAt: { lte: cutoff }, expiresAt: { gte: new Date() } }, include: { client: true }, orderBy: { lastViewedAt: 'desc' } });
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
  const empresa = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';
  const result = proposals.map((p) => {
    const daysSinceView = Math.floor((Date.now() - new Date(p.lastViewedAt!).getTime()) / 86400000);
    const proposalLink = `${frontendUrl}/proposta/${p.id}`;
    const waMsg = encodeURIComponent(`Olá ${p.client.name}! Tudo bem? Queria saber se ficou com alguma dúvida sobre seu orçamento ${p.proposalCode}. Ainda temos condições especiais disponíveis! 😊`);
    return { id: p.id, proposalCode: p.proposalCode, clientName: p.client.name, whatsapp: p.client.whatsapp, status: p.status, totalCashCents: p.totalCashCents, lastViewedAt: p.lastViewedAt, daysSinceView, expiresAt: p.expiresAt, proposalLink, whatsappLink: `https://wa.me/${p.client.whatsapp.replace(/\D/g,'')}?text=${waMsg}` };
  });
  return res.status(200).json(result);
}
