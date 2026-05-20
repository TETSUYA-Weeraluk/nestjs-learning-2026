import z from 'zod/v3';

const INSECURE_JWT_SECRETS = new Set([
  'change-me-in-production',
  'tetsuya-secret-key',
  'your-super-secret-key-change-in-production',
]);

const nodeEnvSchema = z.enum(['development', 'production', 'test']);

export const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default('development'),
    PORT: z.coerce.number().int().positive().default(5555),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) =>
          url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DATABASE_URL must be a PostgreSQL connection string',
      ),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 32 characters in production',
        });
      }
      if (INSECURE_JWT_SECRETS.has(env.JWT_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'JWT_SECRET must not use a default or example value in production',
        });
      }
      if (!env.CORS_ORIGIN?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGIN'],
          message:
            'CORS_ORIGIN is required in production (comma-separated allowed origins)',
        });
      }
    }

    if (env.NODE_ENV === 'development' && env.JWT_SECRET.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 16 characters in development',
      });
    }
  });

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, string | number> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${details}`);
  }

  return result.data;
}

export function parseCorsOrigins(
  corsOrigin: string | undefined,
  nodeEnv: EnvSchema['NODE_ENV'],
): string[] {
  if (corsOrigin?.trim()) {
    return corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }

  return [];
}
