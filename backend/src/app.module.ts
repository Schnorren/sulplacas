// backend/src/app.module.ts
// SUBSTITUA o conteúdo atual por este

import { Module } from '@nestjs/common';
import { ProposalsModule } from './proposals/proposals.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    ProposalsModule,
    HealthModule,
  ],
})
export class AppModule {}
