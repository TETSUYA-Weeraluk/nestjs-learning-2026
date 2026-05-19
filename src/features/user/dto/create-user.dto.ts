import { createZodDto } from 'nestjs-zod';
import { USER_ROLE } from 'src/generated/prisma/enums';
import z from 'zod/v3';

const CreateAddressSchema = z.object({
  address: z.string().min(1, 'กรุณากรอกรายละเอียดที่อยู่'),
  city: z.string().min(1, 'กรุณากรอกเมือง/อำเภอ'),
  state: z.string().min(1, 'กรุณากรอกจังหวัด'),
  zip: z.string().min(1, 'กรุณากรอกรหัสไปรษณีย์'),
  country: z.string().min(1, 'กรุณากรอกประเทศ'),
});

const CreateUserSchema = z.object({
  first_name: z
    .string({ message: 'กรุณากรอกชื่อ' })
    .min(1, 'กรุณากรอกชื่อ')
    .trim(),
  last_name: z
    .string({ message: 'กรุณากรอกนามสกุล' })
    .min(1, 'กรุณากรอกนามสกุล')
    .trim(),
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z.string().min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  role: z
    .nativeEnum(USER_ROLE, {
      invalid_type_error: 'สิทธิ์การใช้งานไม่ถูกต้อง',
    })
    .optional()
    .default('USER'),
  isActive: z.boolean().optional().default(true),
  address: CreateAddressSchema,
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
