import { createZodDto } from 'nestjs-zod';
import z from 'zod/v3';

const LoginSchema = z.object({
  email: z.string().email({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  password: z
    .string({ message: 'กรุณากรอกรหัสผ่าน' })
    .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
});

export class LoginDto extends createZodDto(LoginSchema) {}
