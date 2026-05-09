// backend/src/proposals/proposals.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateUpsellsDto } from './dto/update-upsells.dto';
import { UpsertUpsellProductDto } from './dto/upsert-upsell-product.dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatBRL(cents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  private formatInstallment(totalCents: number, rateX100: number, months: number): string {
    const total = totalCents * (rateX100 / 100);
    return this.formatBRL(Math.round(total / months));
  }

  private async generateProposalCode(): Promise<string> {
    const counter = await this.prisma.proposalCounter.upsert({
      where:  { id: 'singleton' },
      update: { count: { increment: 1 } },
      create: { id: 'singleton', count: 1 },
    });
    const year = new Date().getFullYear();
    const seq  = String(counter.count).padStart(4, '0');
    return `ORC-${year}-${seq}`;
  }

  // ── Log de evento ─────────────────────────────────────────────────────────
  private async logEvent(proposalId: string, type: string, payload?: object) {
    await this.prisma.proposalEvent.create({
      data: { proposalId, type, payload: payload ?? undefined },
    });
  }

  private async calcPrice(
    areaM2: number,
    displacementCostCents: number,
    selectedUpsellIds: string[],
    hiddenMarginCents = 0,
  ) {
    const configs = await this.prisma.pricingConfig.findMany();
    const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const basePriceCents      = cfg['BASE_PRICE']             ?? 390000;
    const baseAreaLimit       = (cfg['BASE_AREA_LIMIT_M2']    ?? 1800) / 100;
    const excessPerM2         = cfg['EXCESS_PER_M2']          ?? 18000;
    const rate12x             = cfg['INSTALLMENT_12X_RATE']   ?? 112;
    const rate18x             = cfg['INSTALLMENT_18X_RATE']   ?? 116;
    const collectorExtraPerM2 = cfg['COLLECTOR_EXTRA_PER_M2'] ?? 0;
    const cardMachineRateBp   = cfg['CARD_MACHINE_RATE']      ?? 0;

    const excessM2            = Math.max(0, areaM2 - baseAreaLimit);
    const excessPriceCents    = Math.round(excessM2 * excessPerM2);
    const collectorExtraCents = Math.round(areaM2 * collectorExtraPerM2);

    let upsellTotalCents = 0;
    if (selectedUpsellIds.length > 0) {
      const upsells = await this.prisma.upsellProduct.findMany({
        where: { id: { in: selectedUpsellIds }, active: true },
      });
      upsellTotalCents = upsells.reduce((sum, u) => sum + u.priceCents, 0);
    }

    const totalCashCents =
      basePriceCents +
      excessPriceCents +
      collectorExtraCents +
      displacementCostCents +
      upsellTotalCents +
      hiddenMarginCents;

    const cardRate       = 1 + cardMachineRateBp / 10000;
    const totalCardCents = Math.round(totalCashCents * cardRate);

    return {
      basePriceCents,
      excessPriceCents,
      collectorExtraCents,
      upsellTotalCents,
      totalCashCents,
      pricing: {
        areaM2,
        totalCash:          this.formatBRL(totalCashCents),
        totalCard:          cardMachineRateBp > 0 ? this.formatBRL(totalCardCents) : null,
        installment12x:     this.formatInstallment(totalCashCents, rate12x, 12),
        installment18x:     this.formatInstallment(totalCashCents, rate18x, 18),
        cardInstallment12x: cardMachineRateBp > 0 ? this.formatInstallment(totalCardCents, rate12x, 12) : null,
        cardInstallment18x: cardMachineRateBp > 0 ? this.formatInstallment(totalCardCents, rate18x, 18) : null,
        breakdown: {
          base:         this.formatBRL(basePriceCents),
          excess:       this.formatBRL(excessPriceCents),
          displacement: this.formatBRL(displacementCostCents),
          upsells:      this.formatBRL(upsellTotalCents),
          hiddenMargin: hiddenMarginCents > 0 ? this.formatBRL(hiddenMarginCents) : null,
        },
      },
    };
  }

  async previewPrice(
    lengthM: number,
    widthM: number,
    displacementCostCents: number,
    hiddenMarginCents = 0,
    selectedUpsellIds: string[] = [],
  ) {
    const areaM2 = parseFloat((lengthM * widthM).toFixed(2));
    const { pricing } = await this.calcPrice(areaM2, displacementCostCents, selectedUpsellIds, hiddenMarginCents);
    return { areaM2, pricing };
  }

  async create(dto: CreateProposalDto) {
    const areaM2                = parseFloat((dto.lengthM * dto.widthM).toFixed(2));
    const displacementCostCents = dto.displacementCostCents ?? 0;
    const hiddenMarginCents     = dto.hiddenMarginCents ?? 0;
    const validityDays          = dto.validityDays ?? 7;

    const { basePriceCents, excessPriceCents, totalCashCents, pricing } =
      await this.calcPrice(areaM2, displacementCostCents, [], hiddenMarginCents);

    const client = await this.prisma.client.upsert({
      where:  { whatsapp: dto.whatsapp },
      update: { name: dto.name, ...(dto.email ? { email: dto.email } : {}) },
      create: { name: dto.name, whatsapp: dto.whatsapp, email: dto.email ?? null },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const proposalCode = await this.generateProposalCode();

    const proposal = await this.prisma.proposal.create({
      data: {
        proposalCode,
        clientId: client.id,
        lengthM:  dto.lengthM,
        widthM:   dto.widthM,
        areaM2,
        clientCity:            dto.clientCity ?? 'Porto Alegre',
        displacementCostCents,
        hiddenMarginCents,
        basePriceCents,
        excessPriceCents,
        totalCashCents,
        validityDays,
        expiresAt,
        status: 'SENT',
      },
      include: { client: true },
    });

    await this.logEvent(proposal.id, 'CREATED', {
      proposalCode,
      totalCashCents,
      clientName: client.name,
    });

    const frontendUrl  = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const whatsapp     = process.env.EMPRESA_WHATSAPP ?? '5551999999999';
    const proposalLink = `${frontendUrl}/proposta/${proposal.id}`;

    return {
      proposalId:   proposal.id,
      proposalCode: proposal.proposalCode,
      proposalLink,
      whatsappLink: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Segue sua proposta ${proposal.proposalCode}: ${proposalLink}`)}`,
      pricing,
    };
  }

  // ── Listagem com filtros ──────────────────────────────────────────────────

  async findAll(filters?: {
    search?: string;
    status?: string;
    dateRange?: 'today' | 'week' | 'month';
    orderBy?: 'createdAt' | 'totalCashCents' | 'status';
    orderDir?: 'asc' | 'desc';
  }) {
    const where: any = {};

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { proposalCode: { contains: q, mode: 'insensitive' } },
        { clientCity:   { contains: q, mode: 'insensitive' } },
        { client: { name:     { contains: q, mode: 'insensitive' } } },
        { client: { whatsapp: { contains: q, mode: 'insensitive' } } },
        { client: { email:    { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters?.dateRange) {
      const start = new Date();
      if      (filters.dateRange === 'today') start.setHours(0, 0, 0, 0);
      else if (filters.dateRange === 'week')  start.setDate(start.getDate() - 7);
      else if (filters.dateRange === 'month') start.setDate(start.getDate() - 30);
      where.createdAt = { gte: start };
    }

    return this.prisma.proposal.findMany({
      where,
      include: { client: true },
      orderBy: { [filters?.orderBy ?? 'createdAt']: filters?.orderDir ?? 'desc' },
    });
  }

  async getStatusCounts() {
    const counts = await this.prisma.proposal.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const result: Record<string, number> = {};
    for (const c of counts) result[c.status] = c._count.status;
    return result;
  }

  // ── Alertas de follow-up ──────────────────────────────────────────────────
  // Propostas VIEWED ou NEGOTIATING sem aprovação há X dias
  async getFollowupAlerts(daysThreshold = 2) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysThreshold);

    const proposals = await this.prisma.proposal.findMany({
      where: {
        status: { in: ['VIEWED', 'NEGOTIATING'] },
        lastViewedAt: { lte: cutoff },
        expiresAt: { gte: new Date() }, // não expiradas
      },
      include: { client: true },
      orderBy: { lastViewedAt: 'desc' },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const empresa     = process.env.EMPRESA_WHATSAPP ?? '5551999999999';

    return proposals.map((p) => {
      const daysSinceView = Math.floor(
        (Date.now() - new Date(p.lastViewedAt!).getTime()) / 86400000,
      );
      const proposalLink = `${frontendUrl}/proposta/${p.id}`;
      const waMsg = encodeURIComponent(
        `Olá ${p.client.name}! Tudo bem? Queria saber se ficou com alguma dúvida sobre seu orçamento ${p.proposalCode}. Ainda temos condições especiais disponíveis! 😊`,
      );
      return {
        id:            p.id,
        proposalCode:  p.proposalCode,
        clientName:    p.client.name,
        whatsapp:      p.client.whatsapp,
        status:        p.status,
        totalCashCents: p.totalCashCents,
        lastViewedAt:  p.lastViewedAt,
        daysSinceView,
        expiresAt:     p.expiresAt,
        proposalLink,
        whatsappLink:  `https://wa.me/${p.client.whatsapp.replace(/\D/g, '')}?text=${waMsg}`,
      };
    });
  }

  // ── Clientes com histórico de propostas ───────────────────────────────────
  async getClients(search?: string) {
    const where: any = {};
    if (search) {
      const q = search.trim();
      where.OR = [
        { name:     { contains: q, mode: 'insensitive' } },
        { whatsapp: { contains: q, mode: 'insensitive' } },
        { email:    { contains: q, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        proposals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, proposalCode: true, status: true,
            totalCashCents: true, createdAt: true,
            areaM2: true, clientCity: true, lastViewedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return clients.map((c) => ({
      ...c,
      totalProposals:  c.proposals.length,
      totalApproved:   c.proposals.filter((p) => p.status === 'APPROVED').length,
      totalValueCents: c.proposals.reduce((s, p) => s + p.totalCashCents, 0),
      lastActivity:    c.proposals[0]?.createdAt ?? c.createdAt,
      hasHot:          c.proposals.some((p) =>
        p.status === 'VIEWED' && p.lastViewedAt &&
        Date.now() - new Date(p.lastViewedAt).getTime() < 48 * 3600000
      ),
    }));
  }

  // ── findOne ───────────────────────────────────────────────────────────────

  async findOne(id: string, userAgent?: string, ip?: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    await this.prisma.proposalView.create({
      data: { proposalId: id, userAgent: userAgent ?? null, ip: ip ?? null },
    });

    const isFirstView = proposal.status === 'SENT';

    await this.prisma.proposal.update({
      where: { id },
      data: {
        viewCount:    { increment: 1 },
        lastViewedAt: new Date(),
        status:       isFirstView ? 'VIEWED' : proposal.status,
      },
    });

    // Loga evento de visualização
    await this.logEvent(id, 'VIEWED', {
      ip: ip ?? null,
      viewCount: proposal.viewCount + 1,
      firstView: isFirstView,
    });

    const allUpsells = await this.prisma.upsellProduct.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const { pricing } = await this.calcPrice(
      proposal.areaM2,
      proposal.displacementCostCents,
      proposal.selectedUpsellIds,
      proposal.hiddenMarginCents,
    );

    return { ...proposal, availableUpsells: allUpsells, pricing };
  }

  async getViews(id: string) {
    return this.prisma.proposalView.findMany({
      where:   { proposalId: id },
      orderBy: { viewedAt: 'desc' },
    });
  }

  // ── Eventos / histórico ───────────────────────────────────────────────────

  async getEvents(id: string) {
    return this.prisma.proposalEvent.findMany({
      where:   { proposalId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── updateUpsells ─────────────────────────────────────────────────────────

  async updateUpsells(id: string, dto: UpdateUpsellsDto) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const { upsellTotalCents, totalCashCents, pricing } = await this.calcPrice(
      proposal.areaM2,
      proposal.displacementCostCents,
      dto.selectedUpsellIds,
      proposal.hiddenMarginCents,
    );

    const wasApproved = proposal.status === 'APPROVED';
    const newStatus   = wasApproved ? 'VIEWED' : proposal.status;

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        selectedUpsellIds: dto.selectedUpsellIds,
        upsellTotalCents,
        totalCashCents,
        status: newStatus,
      },
      include: { client: true },
    });

    await this.logEvent(id, 'UPSELLS_CHANGED', {
      selectedUpsellIds: dto.selectedUpsellIds,
      newTotal: totalCashCents,
      approvalReverted: wasApproved,
    });

    return { ...updated, pricing, statusReverted: wasApproved };
  }

  async approve(id: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const updated = await this.prisma.proposal.update({
      where: { id },
      data:  { status: 'APPROVED' },
    });

    await this.logEvent(id, 'APPROVED', {
      totalCashCents: proposal.totalCashCents,
      selectedUpsellIds: proposal.selectedUpsellIds,
    });

    return updated;
  }

  async updateStatus(id: string, status: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const updated = await this.prisma.proposal.update({
      where: { id },
      data:  { status: status as any },
    });

    await this.logEvent(id, 'STATUS_CHANGED', {
      from: proposal.status,
      to:   status,
    });

    return updated;
  }

  async updateNotes(id: string, notes: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const updated = await this.prisma.proposal.update({
      where: { id },
      data:  { internalNotes: notes },
    });

    await this.logEvent(id, 'NOTES_UPDATED', { preview: notes.slice(0, 80) });

    return updated;
  }

  async markContacted(id: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const updated = await this.prisma.proposal.update({
      where: { id },
      data:  { lastContactedAt: new Date() },
    });

    await this.logEvent(id, 'CONTACTED');

    return updated;
  }

  async duplicate(id: string) {
    const original = await this.prisma.proposal.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!original) throw new NotFoundException('Proposta não encontrada');

    const proposalCode = await this.generateProposalCode();
    const validityDays = original.validityDays ?? 7;
    const expiresAt    = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const copy = await this.prisma.proposal.create({
      data: {
        proposalCode,
        clientId:              original.clientId,
        lengthM:               original.lengthM,
        widthM:                original.widthM,
        areaM2:                original.areaM2,
        clientCity:            original.clientCity,
        displacementCostCents: original.displacementCostCents,
        hiddenMarginCents:     original.hiddenMarginCents,
        basePriceCents:        original.basePriceCents,
        excessPriceCents:      original.excessPriceCents,
        totalCashCents:        original.totalCashCents,
        selectedUpsellIds:     original.selectedUpsellIds,
        upsellTotalCents:      original.upsellTotalCents,
        validityDays,
        expiresAt,
        status: 'SENT',
      },
      include: { client: true },
    });

    await this.logEvent(copy.id, 'CREATED', {
      proposalCode,
      duplicatedFrom: original.proposalCode,
    });

    const frontendUrl  = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const whatsapp     = process.env.EMPRESA_WHATSAPP ?? '5551999999999';
    const proposalLink = `${frontendUrl}/proposta/${copy.id}`;

    return {
      proposalId:   copy.id,
      proposalCode: copy.proposalCode,
      proposalLink,
      whatsappLink: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Segue sua proposta ${copy.proposalCode}: ${proposalLink}`)}`,
    };
  }

  // ── Pricing Config ────────────────────────────────────────────────────────

  async getPricingConfigs() {
    return this.prisma.pricingConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async updatePricingConfig(key: string, value: number) {
    return this.prisma.pricingConfig.upsert({
      where:  { key },
      update: { value },
      create: { key, value, label: key },
    });
  }

  // ── Upsell Products ───────────────────────────────────────────────────────

  async listUpsellProducts() {
    return this.prisma.upsellProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createUpsellProduct(dto: UpsertUpsellProductDto) {
    return this.prisma.upsellProduct.create({ data: dto });
  }

  async updateUpsellProduct(id: string, dto: UpsertUpsellProductDto) {
    return this.prisma.upsellProduct.update({ where: { id }, data: dto });
  }

  async deleteUpsellProduct(id: string) {
    return this.prisma.upsellProduct.delete({ where: { id } });
  }
}
