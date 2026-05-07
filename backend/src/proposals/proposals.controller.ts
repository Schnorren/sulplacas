// backend/src/proposals/proposals.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateUpsellsDto } from './dto/update-upsells.dto';
import { UpsertUpsellProductDto } from './dto/upsert-upsell-product.dto';

@Controller()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('proposals')
  create(@Body() dto: CreateProposalDto) {
    return this.proposalsService.create(dto);
  }

  @Get('proposals')
  findAll() {
    return this.proposalsService.findAll();
  }

  // Passa userAgent e IP para registrar no histórico
  @Get('proposals/:id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    return this.proposalsService.findOne(id, userAgent, ip);
  }

  // Histórico de visualizações — usado pelo admin
  @Get('proposals/:id/views')
  getViews(@Param('id') id: string) {
    return this.proposalsService.getViews(id);
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
