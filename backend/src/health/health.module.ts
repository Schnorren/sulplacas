// backend/src/health/health.module.ts

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { KeepAliveController } from './keep-alive.controller';

@Module({
  controllers: [HealthController, KeepAliveController],
})
export class HealthModule {}
