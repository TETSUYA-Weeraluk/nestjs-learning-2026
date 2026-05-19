import { createZodDto } from 'nestjs-zod';
import z from 'zod/v3';

const RefreshTokenSchema = z.object({
  refresh_token: z
    .string({ message: 'กรุณาระบุ refresh token' })
    .min(1, 'กรุณาระบุ refresh token'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
