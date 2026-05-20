import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  Catch,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod/v3';

interface NestCustomError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface ZodErrorDetail {
  field: string;
  error: string;
}

// รวมร่าง Type ทั้งหมดที่เป็นไปได้ให้กับตัวแปร message
type FilterMessageType = string | string[] | ZodErrorDetail[];

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let message: FilterMessageType = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (exception instanceof ZodValidationException) {
        const zodErrors = (exception.getZodError() as ZodError).errors;

        message = zodErrors.map((err) => ({
          field: err.path.length > 0 ? err.path.join('.') : 'body',
          error: err.message,
        }));
      } else if (typeof errorResponse === 'object' && errorResponse !== null) {
        const customError = errorResponse as NestCustomError;

        if (customError.message) {
          message = customError.message;
        }
      } else if (typeof errorResponse === 'string') {
        message = errorResponse;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'ไม่พบข้อมูลที่ต้องการ หรือข้อมูลนี้ถูกลบไปแล้ว';
      } else if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = this.formatUniqueConstraintMessage(exception);
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Database error: ${exception.code}`;
      }
    }

    this.logException(request, status, message, exception);

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private formatUniqueConstraintMessage(
    exception: PrismaClientKnownRequestError,
  ): string {
    const target = exception.meta?.target;
    if (Array.isArray(target) && target.length > 0) {
      return `${target.join(', ')} มีอยู่ในระบบแล้ว`;
    }
    return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
  }

  private logException(
    request: Request,
    status: number,
    message: FilterMessageType,
    exception: unknown,
  ): void {
    const formattedMessage =
      typeof message === 'string' ? message : JSON.stringify(message);
    const requestId = request.requestId ?? '-';
    const logLine = `[${requestId}] [${request.method} ${request.url}] ${status} - ${formattedMessage}`;

    if (status >= 500) {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    this.logger.warn(logLine);
  }
}
