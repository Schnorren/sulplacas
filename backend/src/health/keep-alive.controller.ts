// backend/src/health/keep-alive.controller.ts
// Endpoint leve usado por um cron externo para evitar que o backend
// "durma" no plano free do Render (spin-down após ~15 min ocioso).

import { Controller, Get } from '@nestjs/common';

@Controller('keep-alive')
export class KeepAliveController {
  @Get()
  ping() {
    return { status: 'awake', timestamp: new Date().toISOString() };
  }
}
