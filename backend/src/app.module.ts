// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProposalsModule } from './proposals/proposals.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FollowupModule } from './followup/followup.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ProposalsModule,
    HealthModule,
    FollowupModule,
  ],
})
export class AppModule {}
