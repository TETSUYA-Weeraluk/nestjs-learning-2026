import { createZodDto } from 'nestjs-zod';
import z from 'zod/v3';

const ChangePasswordSchema = z
  .object({
    current_password: z
      .string({ message: 'กรุณากรอกรหัสผ่านปัจจุบัน' })
      .min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    new_password: z
      .string({ message: 'กรุณากรอกรหัสผ่านใหม่' })
      .min(6, 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  })
  .strict();

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
