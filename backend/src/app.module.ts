import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { ProposalsModule } from './proposals/proposals.module';
import { FollowupModule } from './followup/followup.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, ProposalsModule, FollowupModule],
})
export class AppModule {}
