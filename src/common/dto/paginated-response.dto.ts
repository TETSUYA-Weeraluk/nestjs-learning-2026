import z from 'zod/v3';

export const PaginationMetaSchema = z.object({
  count: z.number().int(),
  page: z.number().int().nullable(),
  limit: z.number().int().nullable(),
  totalPages: z.number().int(),
});

export function createPaginatedResponseDto<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}
