import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../../config/app.config.js';

@Injectable()
export class HmacSignatureGuard implements CanActivate {
  private readonly logger = new Logger(HmacSignatureGuard.name);

  constructor(private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = request.rawBody;

    if (!signature || !rawBody) {
      this.logger.warn(
        {
          audit: true,
          event: 'hmac_rejected',
          reason: 'missing_header',
          sourceIp: request.ip,
        },
        'Webhook rejected: missing signature or body',
      );
      throw new UnauthorizedException();
    }

    const expected =
      'sha256=' +
      createHmac('sha256', this.config.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      this.logger.warn(
        {
          audit: true,
          event: 'hmac_rejected',
          reason: 'signature_mismatch',
          sourceIp: request.ip,
        },
        'Webhook rejected: signature mismatch',
      );
      throw new UnauthorizedException();
    }

    return true;
  }
}
