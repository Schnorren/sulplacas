import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import PDFDocument from 'pdfkit';
import { calcPrice, logEvent, BOT_UA_REGEX } from '../../../lib/proposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (req.method === 'GET') {
    const proposal = await prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

    // increment view count
    // register view only if not a bot
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ip = (req.headers['x-forwarded-for'] as string) ?? (req.headers['x-real-ip'] as string) ?? undefined;
    const isBot = !!userAgent && BOT_UA_REGEX.test(userAgent);
    if (!isBot) {
      await prisma.proposalView.create({ data: { proposalId: id, userAgent: userAgent ?? null, ip: ip ?? null } as any });
      const isFirstView = proposal.status === 'SENT';
      await prisma.proposal.update({ where: { id }, data: { viewCount: { increment: 1 } as any, lastViewedAt: new Date(), status: isFirstView ? 'VIEWED' : proposal.status } as any });
      await logEvent(id, 'VIEWED', { ip: ip ?? null, viewCount: (proposal.viewCount ?? 0) + 1, firstView: isFirstView });
    }

    const allUpsells = await prisma.upsellProduct.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    const { pricing } = await calcPrice(proposal.areaM2, proposal.displacementCostCents, proposal.selectedUpsellIds, proposal.hiddenMarginCents);
    return res.status(200).json({ ...proposal, availableUpsells: allUpsells, pricing });
  }

  if (req.method === 'PATCH') {
    const action = req.query.action as string | undefined;
    const body = req.body;
    if (action === 'upsells') {
      const { selectedUpsellIds = [] } = body;
      const proposal = await prisma.proposal.findUnique({ where: { id } });
      if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

      const upsells = await prisma.upsellProduct.findMany({ where: { id: { in: selectedUpsellIds } } });
      const upsellTotalCents = upsells.reduce((s, u) => s + (u.priceCents ?? 0), 0);
      const totalCashCents = (proposal.basePriceCents ?? 0) + upsellTotalCents + (proposal.displacementCostCents ?? 0) + (proposal.hiddenMarginCents ?? 0);

      const updated = await prisma.proposal.update({ where: { id }, data: { selectedUpsellIds, upsellTotalCents, totalCashCents } });
      await prisma.proposalEvent.create({ data: { proposalId: id, type: 'UPSELLS_CHANGED', meta: { selectedUpsellIds } } as any });
      return res.status(200).json(updated);
    }

    if (action === 'approve') {
      const proposal = await prisma.proposal.findUnique({ where: { id } });
      if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
      const updated = await prisma.proposal.update({ where: { id }, data: { status: 'APPROVED' } });
      await prisma.proposalEvent.create({ data: { proposalId: id, type: 'APPROVED', meta: { totalCashCents: proposal.totalCashCents } } as any });
      return res.status(200).json(updated);
    }

    return res.status(400).json({ error: 'Ação inválida' });
  }

  if (req.method === 'HEAD' || req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' && req.query.pdf === '1') {
    // unreachable due to earlier GET; kept in case direct pdf route used
  }

  if (req.method === 'GET' && req.query.pdf) {
    // Stream PDF
    const proposal = await prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="proposta-${proposal.proposalCode}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res as any);

    // Header
    doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text('Sul Placas', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica').fillColor('#374151').text(`Proposta: ${proposal.proposalCode}`);
    doc.moveDown(0.5);

    // Client block
    doc.fontSize(11).fillColor('#111827').text(`Cliente: ${proposal.client.name}`);
    if (proposal.client.whatsapp) doc.text(`WhatsApp: ${proposal.client.whatsapp}`);
    if (proposal.client.email) doc.text(`Email: ${proposal.client.email}`);
    doc.text(`Cidade: ${proposal.clientCity}`);
    doc.moveDown(0.5);

    // Dimensions & pricing
    doc.fontSize(12).font('Helvetica-Bold').text('Resumo do orçamento');
    doc.moveDown(0.2);
    const { pricing } = await calcPrice(proposal.areaM2, proposal.displacementCostCents, proposal.selectedUpsellIds ?? [], proposal.hiddenMarginCents ?? 0);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Área: ${proposal.areaM2} m²`);
    doc.text(`Preço total: ${pricing.totalCash}`);
    if (pricing.totalCard) doc.text(`Preço no cartão: ${pricing.totalCard}`);
    doc.moveDown(0.2);

    doc.text('Detalhamento:', { underline: true });
    doc.list([
      `Base: ${pricing.breakdown.base}`,
      `Excesso: ${pricing.breakdown.excess}`,
      `Deslocamento: ${pricing.breakdown.displacement}`,
      `Upsells: ${pricing.breakdown.upsells}`,
      pricing.breakdown.hiddenMargin ? `Margem oculta: ${pricing.breakdown.hiddenMargin}` : '',
    ].filter(Boolean));

    doc.moveDown(0.5);

    // Upsells
    if (proposal.selectedUpsellIds && proposal.selectedUpsellIds.length > 0) {
      const ups = await prisma.upsellProduct.findMany({ where: { id: { in: proposal.selectedUpsellIds } } });
      if (ups.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Itens adicionais');
        doc.moveDown(0.2);
        ups.forEach((u) => doc.fontSize(10).text(`${u.name} — ${u.description ?? ''} — ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((u.priceCents||0)/100)}`));
      }
    }

    doc.moveDown(1);
    // Installments
    doc.fontSize(11).font('Helvetica-Bold').text('Parcelamento');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text(`12x de ${pricing.installment12x}`);
    doc.text(`18x de ${pricing.installment18x}`);

    doc.moveDown(1);
    // Footer / contact
    const whatsapp = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
    doc.fontSize(10).text(`Para aprovar, acesse: ${frontendUrl}/proposta/${proposal.id}`);
    doc.text(`Ou envie mensagem: https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero aprovar a proposta ${proposal.proposalCode}`)}`);

    doc.end();
    return;
  }

  return res.status(405).end();
}
