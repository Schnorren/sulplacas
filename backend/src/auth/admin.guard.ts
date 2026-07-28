import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

// Protege as rotas de admin/escrita. As rotas do cliente são marcadas com
// @Public(). Default-deny: o que não for explicitamente público exige o secret.
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const secret = process.env.ADMIN_API_SECRET;
    if (!secret) {
      this.logger.error(
        'ADMIN_API_SECRET não configurado — bloqueando todas as rotas de admin.',
      );
      throw new UnauthorizedException('Servidor sem credencial de admin configurada');
    }

    const req = context.switchToHttp().getRequest();
    const provided = req.headers['x-admin-secret'];
    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Não autorizado');
    }
    return true;
  }
}
