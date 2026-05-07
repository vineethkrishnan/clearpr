import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { HmacSignatureGuard } from '../../infrastructure/guards/hmac-signature.guard.js';
import { WebhookDispatcherService } from '../../application/use-cases/webhook-dispatcher.use-case.js';
import { WebhookEventDto } from '../../application/dtos/webhook-event.dto.js';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly dispatcher: DispatchWebhookUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(HmacSignatureGuard)
  // Override the global pipe: GitHub sends many fields the DTO does not
  // declare. Use `whitelist: true` to strip the rest instead of rejecting.
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleWebhook(
    @Req() request: Request,
    @Body() body: WebhookEventDto,
  ): Promise<{ received: boolean }> {
    const event = request.headers['x-github-event'] as string | undefined;
    const deliveryId = request.headers['x-github-delivery'] as string | undefined;

    if (!event || !deliveryId) {
      this.logger.warn('Webhook missing required headers');
      return { received: false };
    }

    if (!body.installation?.id) {
      this.logger.warn({ event, deliveryId }, 'Webhook missing installation ID');
      return { received: false };
    }

    await this.dispatcher.dispatch({
      event,
      action: body.action ?? '',
      deliveryId,
      installationId: body.installation.id,
      body,
    });

    return { received: true };
  }
}
