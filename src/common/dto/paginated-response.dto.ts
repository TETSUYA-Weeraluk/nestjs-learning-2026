import z from 'zod/v3';

export function createPaginatedResponseDto<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  const PaginatedResponseSchema = z.object({
    data: z.array(itemSchema),
    count: z.number().int(),
    page: z.number().int().nullable(),
    limit: z.number().int().nullable(),
    totalPages: z.number().int(),
  });

  const ResponseArraySchema = z.array(itemSchema);

  const ResponseUnionSchema = z.union([
    PaginatedResponseSchema,
    ResponseArraySchema,
  ]);

  return ResponseUnionSchema;
}
