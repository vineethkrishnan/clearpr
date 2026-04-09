import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { HmacSignatureGuard } from '../infrastructure/guards/hmac-signature.guard.js';
import { WebhookDispatcherService } from '../application/services/webhook-dispatcher.service.js';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(HmacSignatureGuard)
  async handleWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const event = request.headers['x-github-event'] as string | undefined;
    const deliveryId = request.headers['x-github-delivery'] as string | undefined;
    const action = (body['action'] as string) ?? '';
    const installation = body['installation'] as { id: number } | undefined;

    if (!event || !deliveryId) {
      this.logger.warn('Webhook missing required headers');
      return { received: false };
    }

    if (!installation?.id) {
      this.logger.warn({ event, deliveryId }, 'Webhook missing installation ID');
      return { received: false };
    }

    await this.dispatcher.dispatch({
      event,
      action,
      deliveryId,
      installationId: installation.id,
      body,
    });

    return { received: true };
  }
}
