import { Module } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { RoiService } from './roi.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalPdfService, RoiService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
