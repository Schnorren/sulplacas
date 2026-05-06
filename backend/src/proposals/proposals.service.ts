import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Region, ProposalStatus } from '../shared/types';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { RoiService } from './roi.service';
import { Request } from 'express';
import { addDays } from 'date-fns';

const PRICING = {
  BASE_PRICE_CENTS: 390000,
  BASE_AREA_M2: 18,
  EXCESS_M2_CENTS: 18000,
  DISPLACEMENT: { PORTO_ALEGRE: 0, REGIAO_METRO: 15000, INTERIOR_LITORAL: 40000 } as Record<string, number>,
  RATE_12X: 0.12,
  RATE_18X: 0.16,
  THERMAL_CENTS: 60000,
  WIFI_CENTS: 30000,
  VALIDITY_DAYS: 7,
};

export function regionLabel(region: string): string {
  const map: Record<string, string> = {
    PORTO_ALEGRE: 'Porto Alegre e arredores',
    REGIAO_METRO: 'Regiao Metropolitana',
    INTERIOR_LITORAL: 'Interior / Litoral',
  };
  return map[region] ?? region;
}

export function centsToBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService, private readonly roiService: RoiService) {}

  calculate(lengthM: number, widthM: number, region: Region) {
    if (lengthM <= 0 || widthM <= 0) throw new BadRequestException('Dimensoes invalidas.');
    const areaM2 = parseFloat((lengthM * widthM).toFixed(2));
    const baseValueCents = PRICING.BASE_PRICE_CENTS;
    const excessAreaValueCents = Math.round(Math.max(0, areaM2 - PRICING.BASE_AREA_M2) * PRICING.EXCESS_M2_CENTS);
    const displacementValueCents = PRICING.DISPLACEMENT[region] ?? 0;
    const totalCashCents = baseValueCents + excessAreaValueCents + displacementValueCents;
    const total12xGrossCents = Math.round(totalCashCents * (1 + PRICING.RATE_12X));
    const installment12xCents = Math.round(total12xGrossCents / 12);
    const total18xGrossCents = Math.round(totalCashCents * (1 + PRICING.RATE_18X));
    const installment18xCents = Math.round(total18xGrossCents / 18);
    return { areaM2, baseValueCents, excessAreaValueCents, displacementValueCents,
      totalCashCents, total12xGrossCents, installment12xCents, total18xGrossCents, installment18xCents };
  }

  async create(dto: CreateProposalDto) {
    const { name, whatsapp, city, lengthM, widthM, region, propertyValueCents } = dto;
    const calc = this.calculate(lengthM, widthM, region);
    const roi = this.roiService.calculate({ totalCashCents: calc.totalCashCents, areaM2: calc.areaM2, propertyValueCents });
    const client = await this.prisma.client.upsert({
      where: { whatsapp }, update: { name, city }, create: { name, whatsapp, city },
    });
    const proposal = await this.prisma.proposal.create({
      data: {
        clientId: client.id, city, lengthM, widthM, areaM2: calc.areaM2, region,
        baseValueCents: calc.baseValueCents, excessAreaValueCents: calc.excessAreaValueCents,
        displacementValueCents: calc.displacementValueCents, totalCashCents: calc.totalCashCents,
        total12xGrossCents: calc.total12xGrossCents, installment12xCents: calc.installment12xCents,
        total18xGrossCents: calc.total18xGrossCents, installment18xCents: calc.installment18xCents,
        thermalCoverPriceCents: PRICING.THERMAL_CENTS, wifiControllerPriceCents: PRICING.WIFI_CENTS,
        roiExtraDays: roi.extraDays, roiDaysWith: roi.daysWith, roiDaysWithout: roi.daysWithout,
        roiDailyCostCents: roi.leisureDayValueCents, roiMonths: roi.paybackMonths,
        status: ProposalStatus.SENT, expiresAt: addDays(new Date(), PRICING.VALIDITY_DAYS),
      },
      include: { client: true },
    });
    const base = process.env.FRONTEND_URL ?? 'https://sulplacas.com.br';
    const proposalLink = `${base}/proposta/${proposal.id}`;
    const phone = client.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Ola ${client.name}! Segue sua proposta Sul Placas: ${proposalLink}`);
    return {
      proposalId: proposal.id, proposalLink,
      whatsappLink: `https://wa.me/55${phone}?text=${msg}`,
      client: { id: client.id, name: client.name, whatsapp: client.whatsapp },
      pricing: { areaM2: calc.areaM2, totalCash: centsToBrl(calc.totalCashCents),
        installment12x: centsToBrl(calc.installment12xCents), installment18x: centsToBrl(calc.installment18xCents) },
    };
  }

  async findByIdAndTrack(id: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!proposal) throw new NotFoundException('Proposta nao encontrada.');
    this.prisma.proposal.update({ where: { id }, data: {
      viewCount: { increment: 1 }, lastViewedAt: new Date(),
      status: proposal.status === ProposalStatus.SENT ? ProposalStatus.VIEWED : proposal.status,
    }}).catch(() => {});
    return this.format(proposal);
  }

  async findById(id: string) {
    return this.prisma.proposal.findUnique({ where: { id }, include: { client: true } });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.proposal.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { client: true } }),
      this.prisma.proposal.count(),
    ]);
    return { data: items.map(p => this.format(p)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUpsells(id: string, thermalCover: boolean, wifiController: boolean) {
    const p = await this.prisma.proposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proposta nao encontrada.');
    return this.prisma.proposal.update({ where: { id }, data: { selectedThermalCover: thermalCover, selectedWifiController: wifiController } });
  }

  async approve(id: string) {
    const p = await this.prisma.proposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proposta nao encontrada.');
    return this.prisma.proposal.update({ where: { id }, data: { status: ProposalStatus.APPROVED } });
  }

  async sign(id: string, signatureName: string, req: Request) {
    const p = await this.prisma.proposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proposta nao encontrada.');
    if (p.signedAt) throw new BadRequestException('Proposta ja assinada.');
    const ua = (req.headers['user-agent'] ?? '').slice(0, 120);
    const ip = ((req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() || 'desconhecido';
    return this.prisma.proposal.update({ where: { id }, data: { signedAt: new Date(), signatureName, signatureIp: ip, signatureDevice: ua } });
  }

  async manualFollowup(id: string) {
    const p = await this.prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!p) throw new NotFoundException('Proposta nao encontrada.');
    const base = process.env.FRONTEND_URL ?? 'https://sulplacas.com.br';
    const url = `${base}/proposta/${id}`;
    const phone = p.client.whatsapp.replace(/\D/g, '');
    const city = (p as any).city ?? 'sua cidade';
    const msg = encodeURIComponent(`Ola ${p.client.name}! Alguma duvida sobre sua proposta em ${city}? ${url}`);
    const link = `https://wa.me/55${phone}?text=${msg}`;
    await this.prisma.proposal.update({ where: { id }, data: { followupSentAt: new Date(), followupWaLink: link, followupType: 'MANUAL' as any } });
    return { link };
  }

  private format(p: any) {
    return {
      id: p.id, status: p.status, expiresAt: p.expiresAt, viewCount: p.viewCount,
      lastViewedAt: p.lastViewedAt, city: p.city,
      client: { name: p.client.name, whatsapp: p.client.whatsapp },
      pool: { lengthM: p.lengthM, widthM: p.widthM, areaM2: p.areaM2, region: p.region },
      pricing: {
        totalCash: centsToBrl(p.totalCashCents), totalCashCents: p.totalCashCents,
        installment12x: centsToBrl(p.installment12xCents), installment12xCents: p.installment12xCents,
        installment18x: centsToBrl(p.installment18xCents), installment18xCents: p.installment18xCents,
        excessAreaValueCents: p.excessAreaValueCents, displacementValueCents: p.displacementValueCents,
      },
      upsells: {
        thermalCover: { price: centsToBrl(p.thermalCoverPriceCents), priceCents: p.thermalCoverPriceCents, selected: p.selectedThermalCover },
        wifiController: { price: centsToBrl(p.wifiControllerPriceCents), priceCents: p.wifiControllerPriceCents, selected: p.selectedWifiController },
      },
      roi: { extraDays: p.roiExtraDays, daysWith: p.roiDaysWith, daysWithout: p.roiDaysWithout,
        paybackMonths: p.roiMonths, leisureDayValueCents: p.roiDailyCostCents,
        yearlyLeisureGainCents: p.roiExtraDays * p.roiDailyCostCents, savingsMonthCents: 28000 },
      signature: { signedAt: p.signedAt, signatureName: p.signatureName },
      installationPhotoUrl: p.installationPhotoUrl,
    };
  }
}
