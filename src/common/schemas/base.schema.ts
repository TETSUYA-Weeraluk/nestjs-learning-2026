import z from 'zod/v3';

export const baseSchemaFields = {
  id: z.string().uuid(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
} as const;

export const baseSchema = z.object(baseSchemaFields);

export type BaseSchema = z.infer<typeof baseSchema>;
