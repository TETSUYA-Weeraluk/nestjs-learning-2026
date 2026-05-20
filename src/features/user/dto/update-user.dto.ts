import { createZodDto } from 'nestjs-zod';
import { USER_ROLE } from 'src/generated/prisma/enums';
import z from 'zod/v3';

const UpdateAddressSchema = z.object({
  address: z.string().min(1, 'กรุณากรอกรายละเอียดที่อยู่').optional(),
  city: z.string().min(1, 'กรุณากรอกเมือง/อำเภอ').optional(),
  state: z.string().min(1, 'กรุณากรอกจังหวัด').optional(),
  zip: z.string().min(1, 'กรุณากรอกรหัสไปรษณีย์').optional(),
  country: z.string().min(1, 'กรุณากรอกประเทศ').optional(),
});

/** Profile fields — ทุก role ที่มีสิทธิ์แก้ user นี้ใช้ schema นี้ (ไม่มี role) */
const UpdateUserSchema = z
  .object({
    first_name: z.string().min(1, 'กรุณากรอกชื่อ').trim().optional(),
    last_name: z.string().min(1, 'กรุณากรอกนามสกุล').trim().optional(),
    email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }).optional(),
    address: UpdateAddressSchema.optional(),
  })
  .strict();

const AdminRoleUpdateSchema = z.object({
  role: z.nativeEnum(USER_ROLE, {
    invalid_type_error: 'สิทธิ์การใช้งานไม่ถูกต้อง',
  }),
});

const AdminUpdateUserSchema = UpdateUserSchema.merge(AdminRoleUpdateSchema);

export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;

export class AdminUpdateUserDto extends createZodDto(AdminUpdateUserSchema) {}
