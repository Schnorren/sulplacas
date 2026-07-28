import { Module } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { RoiService } from './roi.service';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalPdfService, RoiService, AdminGuard],
  exports: [ProposalsService],
})
export class ProposalsModule {}
