import { Module } from '@nestjs/common';
import { FollowupService } from './followup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], providers: [FollowupService], exports: [FollowupService] })
export class FollowupModule {}
