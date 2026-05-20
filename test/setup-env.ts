import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://admin:admin@localhost:5432/nestjs2026-learning';
process.env.JWT_SECRET ??= 'test-jwt-secret-min-16-chars';
