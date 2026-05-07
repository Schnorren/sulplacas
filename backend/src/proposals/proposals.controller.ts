// backend/src/proposals/proposals.controller.ts

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, Res,
  HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProposalsService } from './proposals.service';
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateUpsellsDto } from './dto/update-upsells.dto';
import { UpsertUpsellProductDto } from './dto/upsert-upsell-product.dto';

@Controller()
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly pdfService: ProposalPdfService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Proposals ─────────────────────────────────────────────────────────────

  @Post('proposals')
  create(@Body() dto: CreateProposalDto) {
    return this.proposalsService.create(dto);
  }

  @Get('proposals')
  findAll() {
    return this.proposalsService.findAll();
  }

  @Get('proposals/:id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    return this.proposalsService.findOne(id, userAgent, ip);
  }

  @Get('proposals/:id/views')
  getViews(@Param('id') id: string) {
    return this.proposalsService.getViews(id);
  }

  @Get('proposals/:id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id }, include: { client: true },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const selectedUpsells = proposal.selectedUpsellIds.length > 0
      ? await this.prisma.upsellProduct.findMany({ where: { id: { in: proposal.selectedUpsellIds } } })
      : [];

    const thermalCover    = selectedUpsells.find((u) => u.name.toLowerCase().includes('capa') || u.name.toLowerCase().includes('térmica'));
    const wifiController  = selectedUpsells.find((u) => u.name.toLowerCase().includes('wi-fi') || u.name.toLowerCase().includes('wifi') || u.name.toLowerCase().includes('controlador'));
    const expiresAtStr    = proposal.expiresAt
      ? new Date(proposal.expiresAt).toLocaleDateString('pt-BR')
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

    const pdfBuffer = await this.pdfService.generate({
      clientName:               proposal.client.name,
      whatsapp:                 proposal.client.whatsapp,
      city:                     proposal.clientCity,
      lengthM:                  proposal.lengthM,
      widthM:                   proposal.widthM,
      areaM2:                   proposal.areaM2,
      regionLabel:              proposal.clientCity,
      totalCashCents:           proposal.totalCashCents,
      excessAreaCents:          proposal.excessPriceCents,
      displacementCents:        proposal.displacementCostCents,
      thermalCover:             !!thermalCover,
      wifiController:           !!wifiController,
      thermalCoverPriceCents:   thermalCover?.priceCents ?? 0,
      wifiControllerPriceCents: wifiController?.priceCents ?? 0,
      expiresAtStr,
    });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-${id.slice(0, 8)}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Patch('proposals/:id/upsells')
  updateUpsells(@Param('id') id: string, @Body() dto: UpdateUpsellsDto) {
    return this.proposalsService.updateUpsells(id, dto);
  }

  @Patch('proposals/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string) {
    return this.proposalsService.approve(id);
  }

  // ── Pricing Config (admin) ────────────────────────────────────────────────

  @Get('admin/pricing')
  getPricingConfigs() {
    return this.proposalsService.getPricingConfigs();
  }

  @Patch('admin/pricing/:key')
  updatePricingConfig(
    @Param('key') key: string,
    @Body() body: { value: number },
  ) {
    return this.proposalsService.updatePricingConfig(key, body.value);
  }

  // ── Upsell Products (admin) ───────────────────────────────────────────────

  @Get('admin/upsells')
  listUpsellProducts() {
    return this.proposalsService.listUpsellProducts();
  }

  @Post('admin/upsells')
  createUpsellProduct(@Body() dto: UpsertUpsellProductDto) {
    return this.proposalsService.createUpsellProduct(dto);
  }

  @Patch('admin/upsells/:id')
  updateUpsellProduct(@Param('id') id: string, @Body() dto: UpsertUpsellProductDto) {
    return this.proposalsService.updateUpsellProduct(id, dto);
  }

  @Delete('admin/upsells/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUpsellProduct(@Param('id') id: string) {
    return this.proposalsService.deleteUpsellProduct(id);
  }
}
