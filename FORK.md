# Fork Checklist

ใช้เอกสารนี้หลัง fork repo นี้ไปเป็นโปรเจกต์ใหม่

## ก่อนรันครั้งแรก

- [ ] เปลี่ยนชื่อ repo / `package.json` → `name` (ถ้าต้องการ)
- [ ] Copy `.env.example` → `.env` แล้วแก้ค่าทั้งหมด (อย่าใช้ค่า template ใน production)

## Environment (`.env`)

| ตัวแปร | ต้องเปลี่ยน | หมายเหตุ |
|--------|-------------|----------|
| `JWT_SECRET` | ✅ | สุ่มค่าใหม่ยาวอย่างน้อย 32 ตัวอักษร |
| `DB_NAME` | ✅ | ชื่อ database ของโปรเจกต์ใหม่ |
| `DB_USER` / `DB_PASSWORD` | แนะนำ | ให้สอดคล้องกับ `DATABASE_URL` |
| `DATABASE_URL` | ✅ | ต้องชี้ไปที่ DB ชื่อใหม่ (`postgresql://user:pass@host:port/dbname`) |
| `PORT` | ตามต้องการ | default `5555` |

## Docker

- [ ] แก้ `container_name` ใน `docker-compose.yml` (เช่น `nestjs2026_db` → `<project>_db`)
- [ ] แก้ชื่อ volume `postgres_data_nestjs2026` (ถ้าไม่ต้องการแชร์ volume กับโปรเจกต์เดิม)

## Database & Seed

```bash
pnpm install
pnpm run db:setup    # ยก DB + migrate + seed