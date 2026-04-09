import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../cls/cls.module.js';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ClsService],
      useFactory: (cls: ClsService) => ({
        pinoHttp: {
          level: process.env['LOG_LEVEL'] ?? 'info',
          transport:
            process.env['NODE_ENV'] !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers["x-hub-signature-256"]',
              'req.body',
              '*.token',
              '*.privateKey',
              '*.apiKey',
              '*.password',
              '*.secret',
            ],
            censor: '[REDACTED]',
          },
          customProps: () => {
            const correlationId = cls.get<string>(CLS_CORRELATION_ID);
            return correlationId ? { correlationId } : {};
          },
          serializers: {
            req: (req: { method: string; url: string }) => ({
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({
              statusCode: res.statusCode,
            }),
          },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
