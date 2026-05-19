import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  Catch,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
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
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // 3. เปลี่ยนมาใช้ Type รวมที่เรากำหนดไว้ข้างบน
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
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
    });
  }
}
