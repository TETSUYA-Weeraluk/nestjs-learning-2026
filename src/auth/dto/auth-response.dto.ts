import { createZodDto } from 'nestjs-zod';
import { USER_ROLE } from 'src/generated/prisma/enums';
import z from 'zod/v3';

const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.nativeEnum(USER_ROLE),
});

const AuthResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: AuthUserSchema,
});

export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}

export class AuthUserResponseDto extends createZodDto(AuthUserSchema) {}

const LogoutResponseSchema = z.object({
  message: z.string(),
});

export class LogoutResponseDto extends createZodDto(LogoutResponseSchema) {}
