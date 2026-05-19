import { createZodDto } from 'nestjs-zod';
import { createPaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { baseSchema } from 'src/common/schemas/base.schema';
import { USER_ROLE } from 'src/generated/prisma/enums';
import z from 'zod/v3';

const AddressResponseSchema = baseSchema
  .omit({
    created_at: true,
  })
  .extend({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
  });

const UserResponseSchema = baseSchema.extend({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(USER_ROLE),
  isActive: z.boolean(),

  address: AddressResponseSchema,
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}

export const FindAllUserResponseDto =
  createPaginatedResponseDto(UserResponseSchema);

export type UserResponse = z.infer<typeof UserResponseSchema>;
