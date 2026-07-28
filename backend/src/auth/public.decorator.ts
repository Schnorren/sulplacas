import { SetMetadata } from '@nestjs/common';

// Marca uma rota como pública (acessível pelo cliente, sem credencial de admin).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
