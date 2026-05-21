import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { PaginationMeta } from '../types/pagination';

interface PaginatedHandlerResult<T = unknown> {
  data: T[];
  meta: PaginationMeta;
}

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

function isPaginatedHandlerResult(
  value: unknown,
): value is PaginatedHandlerResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const meta = candidate.meta;

  if (
    !Array.isArray(candidate.data) ||
    meta === null ||
    typeof meta !== 'object'
  ) {
    return false;
  }

  const metaRecord = meta as Record<string, unknown>;

  return (
    typeof metaRecord.count === 'number' &&
    (typeof metaRecord.page === 'number' || metaRecord.page === null) &&
    (typeof metaRecord.limit === 'number' || metaRecord.limit === null) &&
    typeof metaRecord.totalPages === 'number'
  );
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown): SuccessResponse => {
        if (isPaginatedHandlerResult(response)) {
          return {
            success: true,
            data: response.data,
            meta: response.meta,
          };
        }

        return {
          success: true,
          data: response,
        };
      }),
    );
  }
}
