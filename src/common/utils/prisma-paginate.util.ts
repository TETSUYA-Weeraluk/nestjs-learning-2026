import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResponse } from '../types/pagination';

type PrismaModelDelegate<T> = {
  findMany: (args: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    orderBy?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }) => Promise<T[]>;
  count: (args: { where?: Record<string, unknown> }) => Promise<number>;
};

interface PaginateOptions {
  searchFields: string[];
  allowedSortFields: string[];
  include?: Record<string, unknown>;
  where?: Record<string, unknown>;
}

export async function prismaPaginate<T>(
  modelDelegate: PrismaModelDelegate<T>,
  query: PaginationQueryDto,
  options: PaginateOptions,
): Promise<PaginatedResponse<T>> {
  const { page, limit, search, sort, order } = query;
  const {
    searchFields,
    allowedSortFields,
    include,
    where: extraWhere,
  } = options;

  const where = {
    ...extraWhere,
    ...(search && searchFields.length > 0
      ? {
          OR: searchFields.map((field) => ({
            [field]: { contains: search, mode: 'insensitive' },
          })),
        }
      : {}),
  };

  const resolvedSort = allowedSortFields.includes(sort ?? '')
    ? sort
    : 'created_at';
  const resolvedOrder = order ?? 'desc';
  const orderBy = { [resolvedSort!]: resolvedOrder };

  let skip: number | undefined;
  let take: number | undefined;

  if (page) {
    const resolvedLimit = limit ?? 10;
    skip = (page - 1) * resolvedLimit;
    take = resolvedLimit;
  }

  const [data, totalCount] = await Promise.all([
    modelDelegate.findMany({
      where: where,
      skip,
      take,
      orderBy: orderBy,
      include,
    }),
    modelDelegate.count({
      where: where,
    }),
  ]);

  const resolvedLimit = page ? (limit ?? 10) : null;
  const totalPages = resolvedLimit ? Math.ceil(totalCount / resolvedLimit) : 1;

  return {
    data,
    meta: {
      count: totalCount,
      page: page ?? null,
      limit: resolvedLimit,
      totalPages,
    },
  };
}
