import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  // 0.0.0.0 necessário para Render e outros cloud providers
  await app.listen(port, '0.0.0.0');
  console.log(`Sul Placas API rodando na porta ${port}`);
}
bootstrap();
