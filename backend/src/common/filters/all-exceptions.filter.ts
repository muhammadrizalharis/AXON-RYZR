import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
}

/**
 * Global exception filter — normalizes all errors into a consistent JSON shape
 * and maps common Prisma errors to sensible HTTP statuses.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string | string[]) ?? exception.message;
        error = r.error as string | undefined;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message } = this.mapPrismaError(exception));
      error = 'Database Error';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    response.status(status).json(body);
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        return {
          status: HttpStatus.CONFLICT,
          message: `Unique constraint failed${target ? ` on: ${target}` : ''}`,
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Requested record was not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
        };
    }
  }
}
