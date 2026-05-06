import {
  Controller, Post, Get, Patch, Param, Body, Query,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus, Req, Res, NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProposalsService, regionLabel, centsToBrl } from './proposals.service';
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateUpsellsDto } from './dto/update-upsells.dto';
import { SignProposalDto } from './dto/sign-proposal.dto';

@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly proposalPdfService: ProposalPdfService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProposalDto) {
    return this.proposalsService.create(dto);
  }

  @Get()
  findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.proposalsService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findByIdAndTrack(id);
  }

  @Patch(':id/upsells')
  @HttpCode(HttpStatus.OK)
  updateUpsells(@Param('id') id: string, @Body() dto: UpdateUpsellsDto) {
    return this.proposalsService.updateUpsells(id, dto.thermalCover, dto.wifiController);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string) {
    return this.proposalsService.approve(id);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  sign(@Param('id') id: string, @Body() dto: SignProposalDto, @Req() req: Request) {
    return this.proposalsService.sign(id, dto.signatureName, req);
  }

  @Post(':id/followup')
  @HttpCode(HttpStatus.OK)
  manualFollowup(@Param('id') id: string) {
    return this.proposalsService.manualFollowup(id);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Query('thermal') thermal: string,
    @Query('wifi') wifi: string,
    @Res() res: Response,
  ) {
    const proposal = await this.proposalsService.findById(id);
    if (!proposal) throw new NotFoundException('Proposta nao encontrada.');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} as ${pad(d.getHours())}h${pad(d.getMinutes())}`;
    const exp = new Date(proposal.expiresAt);
    const sig = proposal.signedAt ? new Date(proposal.signedAt) : null;

    const pdfBuffer = await this.proposalPdfService.generate({
      clientName: proposal.client.name, whatsapp: proposal.client.whatsapp,
      city: (proposal as any).city ?? '',
      lengthM: proposal.lengthM, widthM: proposal.widthM, areaM2: proposal.areaM2,
      regionLabel: regionLabel(proposal.region),
      totalCashCents: proposal.totalCashCents,
      excessAreaCents: proposal.excessAreaValueCents, displacementCents: proposal.displacementValueCents,
      thermalCover: thermal === 'true', wifiController: wifi === 'true',
      thermalCoverPriceCents: proposal.thermalCoverPriceCents,
      wifiControllerPriceCents: proposal.wifiControllerPriceCents,
      expiresAtStr: fmt(exp),
      signatureName: proposal.signatureName ?? '',
      signedAtStr: sig ? fmt(sig) : '',
    });

    const safeName = proposal.client.name.replace(/\s+/g, '-').toLowerCase();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-sulplacas-${safeName}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store',
    });
    res.end(pdfBuffer);
  }
}
