// backend/src/proposals/proposals.controller.ts

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, Res, Query,
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

  @Post('proposals/preview')
  previewPrice(@Body() body: {
    lengthM: number; widthM: number;
    displacementCostCents?: number; hiddenMarginCents?: number; selectedUpsellIds?: string[];
  }) {
    return this.proposalsService.previewPrice(
      body.lengthM, body.widthM,
      body.displacementCostCents ?? 0, body.hiddenMarginCents ?? 0, body.selectedUpsellIds ?? [],
    );
  }

  @Post('proposals')
  create(@Body() dto: CreateProposalDto) { return this.proposalsService.create(dto); }

  @Get('proposals')
  findAll(
    @Query('search') search?: string, @Query('status') status?: string,
    @Query('dateRange') dateRange?: 'today'|'week'|'month',
    @Query('orderBy') orderBy?: 'createdAt'|'totalCashCents'|'status',
    @Query('orderDir') orderDir?: 'asc'|'desc',
  ) { return this.proposalsService.findAll({ search, status, dateRange, orderBy, orderDir }); }

  @Get('proposals/status-counts')
  getStatusCounts() { return this.proposalsService.getStatusCounts(); }

  @Get('proposals/:id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    return this.proposalsService.findOne(id, userAgent, ip);
  }

  @Get('proposals/:id/views')
  getViews(@Param('id') id: string) { return this.proposalsService.getViews(id); }

  @Get('proposals/:id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id }, include: { client: true } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    const configs = await this.prisma.pricingConfig.findMany();
    const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    const rate12x       = cfg['INSTALLMENT_12X_RATE'] ?? 112;
    const rate18x       = cfg['INSTALLMENT_18X_RATE'] ?? 116;
    const baseAreaLimit = (cfg['BASE_AREA_LIMIT_M2']  ?? 1800) / 100;
    const excessPerM2   = cfg['EXCESS_PER_M2']        ?? 18000;

    const selectedUpsells = proposal.selectedUpsellIds.length > 0
      ? await this.prisma.upsellProduct.findMany({ where: { id: { in: proposal.selectedUpsellIds } } })
      : [];

    const upsells = selectedUpsells.map((u) => ({
      name: u.name, description: u.description, priceCents: u.priceCents,
    }));

    const expiresAtStr = proposal.expiresAt
      ? new Date(proposal.expiresAt).toLocaleDateString('pt-BR')
      : new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR');

    const pdfBuffer = await this.pdfService.generate({
      proposalCode:      proposal.proposalCode,
      clientName:        proposal.client.name,
      whatsapp:          proposal.client.whatsapp,
      email:             (proposal.client as any).email ?? '',
      city:              proposal.clientCity,
      lengthM:           proposal.lengthM,
      widthM:            proposal.widthM,
      areaM2:            proposal.areaM2,
      regionLabel:       proposal.clientCity,
      totalCashCents:    proposal.totalCashCents,
      excessAreaCents:   proposal.excessPriceCents,
      displacementCents: proposal.displacementCostCents,
      baseAreaLimit,
      excessPerM2Cents:  excessPerM2,
      upsells,
      rate12x, rate18x,
      months12x: 12, months18x: 18,
      expiresAtStr,
      createdAtStr: new Date(proposal.createdAt).toLocaleDateString('pt-BR'),
    });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-${proposal.proposalCode ?? id.slice(0,8)}.pdf"`,
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
  approve(@Param('id') id: string) { return this.proposalsService.approve(id); }

  @Patch('proposals/:id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.proposalsService.updateStatus(id, body.status);
  }

  @Patch('proposals/:id/notes')
  @HttpCode(HttpStatus.OK)
  updateNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.proposalsService.updateNotes(id, body.notes);
  }

  @Patch('proposals/:id/contacted')
  @HttpCode(HttpStatus.OK)
  markContacted(@Param('id') id: string) { return this.proposalsService.markContacted(id); }

  @Post('proposals/:id/duplicate')
  duplicate(@Param('id') id: string) { return this.proposalsService.duplicate(id); }

  @Get('admin/pricing')
  getPricingConfigs() { return this.proposalsService.getPricingConfigs(); }

  @Patch('admin/pricing/:key')
  updatePricingConfig(@Param('key') key: string, @Body() body: { value: number }) {
    return this.proposalsService.updatePricingConfig(key, body.value);
  }

  @Get('admin/upsells')
  listUpsellProducts() { return this.proposalsService.listUpsellProducts(); }

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
