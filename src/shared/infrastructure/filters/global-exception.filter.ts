import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../domain/errors/domain-error.base.js';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request.headers['x-github-delivery'] as string) ?? undefined;
    const { statusCode, body } = this.buildResponse(exception, correlationId);

    this.logger.error(
      {
        correlationId,
        statusCode,
        errorCode: body.error,
        path: request.url,
        method: request.method,
      },
      exception instanceof Error ? exception.message : 'Unknown error',
    );

    response.status(statusCode).json(body);
  }

  private buildResponse(
    exception: unknown,
    correlationId?: string,
  ): { statusCode: number; body: ErrorResponseBody } {
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        body: {
          statusCode: exception.getStatus(),
          error: exception.name,
          message: exception.message,
          correlationId,
        },
      };
    }

    if (exception instanceof DomainError) {
      const statusCode = exception.isTransient
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.UNPROCESSABLE_ENTITY;

      return {
        statusCode,
        body: {
          statusCode,
          error: exception.code,
          message: exception.message,
          correlationId,
        },
      };
    }

    // Unknown errors — never expose internals
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        correlationId,
      },
    };
  }
}
