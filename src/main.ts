import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './shared/infrastructure/filters/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
    bodyParser: true,
  });

  // Trust the first proxy layer (typical: nginx/Caddy/ALB -> app). When deployed
  // without a proxy, req.ip still falls back to the socket address, so this is
  // safe in dev too. Bump the value if you have multiple proxy layers.
  app.set('trust proxy', 1);

  app.useLogger(app.get(Logger));

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.enableCors({ origin: false });
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

void bootstrap();
