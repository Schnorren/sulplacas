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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  private formatInstallment(totalCents: number, rateX100: number, months: number): string {
    const total = totalCents * (rateX100 / 100);
    return this.formatBRL(Math.round(total / months));
  }

  private async calcPrice(
    areaM2: number,
    displacementCostCents: number,
    selectedUpsellIds: string[],
  ) {
    const configs = await this.prisma.pricingConfig.findMany();
    const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    const basePriceCents       = cfg['BASE_PRICE']             ?? 390000;
    const baseAreaLimit        = (cfg['BASE_AREA_LIMIT_M2']    ?? 1800) / 100;
    const excessPerM2          = cfg['EXCESS_PER_M2']          ?? 18000;
    const rate12x              = cfg['INSTALLMENT_12X_RATE']   ?? 112;
    const rate18x              = cfg['INSTALLMENT_18X_RATE']   ?? 116;

    // Extra por m² de placas coletoras — invisível no breakdown, some no total
    const collectorExtraPerM2  = cfg['COLLECTOR_EXTRA_PER_M2'] ?? 0;

    // Taxa da maquininha em centésimos de % (ex: 350 = 3.50%)
    // Usado para calcular o total com maquininha
    const cardMachineRateBp    = cfg['CARD_MACHINE_RATE']      ?? 0;

    // Excedente de área
    const excessM2 = Math.max(0, areaM2 - baseAreaLimit);
    const excessPriceCents = Math.round(excessM2 * excessPerM2);

    // Extra coletores (embutido no total, sem linha separada)
    const collectorExtraCents = Math.round(areaM2 * collectorExtraPerM2);

    // Upsells selecionados
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
      upsellTotalCents;

    // Total com maquininha = totalCash * (1 + rate/10000)
    const cardRate = 1 + cardMachineRateBp / 10000;
    const totalCardCents = Math.round(totalCashCents * cardRate);

    return {
      basePriceCents,
      excessPriceCents,
      collectorExtraCents,
      upsellTotalCents,
      totalCashCents,
      pricing: {
        areaM2,
        totalCash:      this.formatBRL(totalCashCents),
        totalCard:      cardMachineRateBp > 0 ? this.formatBRL(totalCardCents) : null,
        installment12x: this.formatInstallment(totalCashCents, rate12x, 12),
        installment18x: this.formatInstallment(totalCashCents, rate18x, 18),
        cardInstallment12x: cardMachineRateBp > 0
          ? this.formatInstallment(totalCardCents, rate12x, 12)
          : null,
        cardInstallment18x: cardMachineRateBp > 0
          ? this.formatInstallment(totalCardCents, rate18x, 18)
          : null,
      },
    };
  }

  async create(dto: CreateProposalDto) {
    const areaM2 = parseFloat((dto.lengthM * dto.widthM).toFixed(2));
    const displacementCostCents = dto.displacementCostCents ?? 0;

    const { basePriceCents, excessPriceCents, totalCashCents, pricing } =
      await this.calcPrice(areaM2, displacementCostCents, []);

    const client = await this.prisma.client.upsert({
      where:  { whatsapp: dto.whatsapp },
      update: { name: dto.name },
      create: { name: dto.name, whatsapp: dto.whatsapp },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const proposal = await this.prisma.proposal.create({
      data: {
        clientId:             client.id,
        lengthM:              dto.lengthM,
        widthM:               dto.widthM,
        areaM2,
        clientCity:           dto.clientCity,
        displacementCostCents,
        basePriceCents,
        excessPriceCents,
        totalCashCents,
        expiresAt,
        status: 'SENT',
      },
      include: { client: true },
    });

    const frontendUrl  = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const whatsapp     = process.env.EMPRESA_WHATSAPP ?? '5551999999999';
    const proposalLink = `${frontendUrl}/proposta/${proposal.id}`;

    return {
      proposalId:   proposal.id,
      proposalLink,
      whatsappLink: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Segue sua proposta: ${proposalLink}`)}`,
      pricing,
    };
  }

  async findAll() {
    return this.prisma.proposal.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userAgent?: string, ip?: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    await this.prisma.proposalView.create({
      data: { proposalId: id, userAgent: userAgent ?? null, ip: ip ?? null },
    });

    await this.prisma.proposal.update({
      where: { id },
      data: {
        viewCount:    { increment: 1 },
        lastViewedAt: new Date(),
        status:       proposal.status === 'SENT' ? 'VIEWED' : proposal.status,
      },
    });

    const allUpsells = await this.prisma.upsellProduct.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const { pricing } = await this.calcPrice(
      proposal.areaM2,
      proposal.displacementCostCents,
      proposal.selectedUpsellIds,
    );

    return { ...proposal, availableUpsells: allUpsells, pricing };
  }

  async getViews(id: string) {
    return this.prisma.proposalView.findMany({
      where:   { proposalId: id },
      orderBy: { viewedAt: 'desc' },
    });
  }

  async updateUpsells(id: string, dto: UpdateUpsellsDto) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const { upsellTotalCents, totalCashCents, pricing } = await this.calcPrice(
      proposal.areaM2,
      proposal.displacementCostCents,
      dto.selectedUpsellIds,
    );

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { selectedUpsellIds: dto.selectedUpsellIds, upsellTotalCents, totalCashCents },
      include: { client: true },
    });

    return { ...updated, pricing };
  }

  async approve(id: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    return this.prisma.proposal.update({ where: { id }, data: { status: 'APPROVED' } });
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
