# NestJS Learning 2026

REST API สำหรับเรียนรู้ NestJS แบบ production-ready ใช้ Feature-based module, Prisma ORM, JWT Authentication พร้อม Refresh Token และ Role-Based Access Control (RBAC)

## Tech Stack

| หมวด | เทคโนโลยี |
|------|-----------|
| Framework | [NestJS 11](https://nestjs.com/) + TypeScript |
| Database | PostgreSQL 17 |
| ORM | [Prisma 7](https://www.prisma.io/) |
| Validation | [Zod](https://zod.dev/) + [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) |
| Auth | JWT + Passport.js + bcrypt |
| API Docs | Swagger (`/api`) |
| Security | Helmet |

## Features

- **Authentication** — Login, Refresh Token (rotation), Logout
- **Authorization** — Global JWT Guard + Role Guard (`USER`, `ADMIN`, `MANAGER`)
- **Public API** — Decorator `@Public()` สำหรับ route ที่ไม่ต้อง auth
- **User Management** — Register, CRUD, Soft delete, Pagination
- **Global Exception Filter** — Error response รูปแบบเดียวกันทั้ง API
- **Docker** — PostgreSQL ผ่าน Docker Compose

## Project Structure

```
src/
├── auth/                    # Authentication (login, refresh, logout)
│   ├── dto/
│   ├── strategies/          # Passport JWT Strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── common/
│   ├── config/              # Configuration, Exception Filter
│   ├── decorators/          # @Public(), @Auth(), @CurrentUser()
│   ├── dto/                 # Shared DTOs (pagination)
│   ├── guard/               # JwtAuthGuard, RolesGuard
│   ├── prisma/              # PrismaService (Global)
│   ├── schemas/             # Zod base schemas
│   ├── types/
│   └── utils/
├── features/
│   ├── user/                # User feature module
│   └── post/                # Post feature module (stub)
├── generated/prisma/        # Prisma Client (auto-generated)
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma
└── migrations/
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (สำหรับ PostgreSQL)

## Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
cd nestjs-learning-2026
pnpm install
```

### 2. Environment Variables

สร้างไฟล์ `.env` จาก template ด้านล่าง:

```env
# Database
DATABASE_URL="postgresql://admin:admin@localhost:5432/nestjs2026-learning"
DB_USER="admin"
DB_PASSWORD="admin"
DB_NAME="nestjs2026-learning"
DB_HOST="localhost"
DB_PORT="5432"

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=5555
```

### 3. Start Database

```bash
docker compose up -d
```

### 4. Database Migration

```bash
# ใช้ migration (แนะนำสำหรับ production)
npx prisma migrate dev

# หรือ sync schema โดยตรง (development)
npx prisma db push
```

### 5. Run Application

```bash
# Development (watch mode)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

Server จะรันที่ `http://localhost:5555`

Swagger UI: `http://localhost:5555/api`

## Scripts

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `pnpm run start:dev` | รัน dev server (hot reload) |
| `pnpm run build` | Build โปรเจกต์ |
| `pnpm run start:prod` | รัน production build |
| `pnpm run lint` | ตรวจ ESLint |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | E2E tests |
| `pnpm run test:cov` | Test coverage |

## Authentication

### Flow

```
Login  → access_token (สั้น) + refresh_token (ยาว)
Refresh → แลก token คู่ใหม่ (rotation — revoke token เก่าทันที)
Logout → revoke refresh_token
```

Refresh token ถูก hash (SHA-256) ก่อนเก็บใน database ไม่เก็บ plain text

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|--------|------|------|----------|
| `POST` | `/auth/login` | Public | Login |
| `POST` | `/auth/refresh` | Public | Refresh token |
| `POST` | `/auth/logout` | Public | Logout (revoke refresh token) |
| `GET` | `/auth/me` | Bearer | ดู profile ตัวเอง |

### ตัวอย่าง

**Login**

```bash
curl -X POST http://localhost:5555/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "a1b2c3...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "USER"
  }
}
```

**เรียก Protected API**

```bash
curl http://localhost:5555/auth/me \
  -H "Authorization: Bearer <access_token>"
```

**Refresh Token**

```bash
curl -X POST http://localhost:5555/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

**Logout**

```bash
curl -X POST http://localhost:5555/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## API Endpoints

### User

| Method | Path | Auth | Role | คำอธิบาย |
|--------|------|------|------|----------|
| `POST` | `/user` | Public | — | Register user |
| `GET` | `/user` | Bearer | ADMIN, MANAGER | List users (pagination) |
| `GET` | `/user/:id` | Bearer | — | Get user by ID |
| `PATCH` | `/user/:id` | Bearer | — | Update user |
| `DELETE` | `/user/:id` | Bearer | — | Soft delete user |

### Pagination Query Params

```
GET /user?page=1&limit=10&search=john&sortBy=created_at&sortOrder=desc
```

| Param | Type | Default | คำอธิบาย |
|-------|------|---------|----------|
| `page` | number | `1` | หน้าที่ต้องการ |
| `limit` | number | `10` | จำนวนต่อหน้า |
| `search` | string | — | ค้นหาใน first_name, last_name, email |
| `sortBy` | string | `created_at` | ฟิลด์ที่ sort ได้ |
| `sortOrder` | `asc` \| `desc` | `desc` | ทิศทาง sort |

## Decorators

### `@Public()`

ข้าม JWT Guard สำหรับ route ที่ไม่ต้อง authentication

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

### `@Auth(...roles)`

กำหนด role ที่เข้าถึงได้ (ใช้ร่วมกับ Global JWT Guard)

```typescript
@Auth(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
@Get()
findAll() { ... }
```

### `@CurrentUser()`

ดึง user จาก JWT payload ใน request

```typescript
@Get('me')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

## Database Schema

```
User ──┬── Address (1:1)
       ├── Post (1:N)
       └── RefreshToken (1:N)

USER_ROLE: USER | ADMIN | MANAGER
```

- User ใช้ **soft delete** ผ่านฟิลด์ `deleted_at`
- Password hash ด้วย **bcrypt** (salt rounds: 10)

## Environment Variables Reference

| Variable | Required | Default | คำอธิบาย |
|----------|----------|---------|----------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `DB_USER` | — | — | ใช้กับ Docker Compose |
| `DB_PASSWORD` | — | — | ใช้กับ Docker Compose |
| `DB_NAME` | — | — | ใช้กับ Docker Compose |
| `DB_HOST` | — | `localhost` | Database host |
| `DB_PORT` | — | `5432` | Database port |
| `JWT_SECRET` | ✅ | — | Secret สำหรับ sign JWT |
| `JWT_EXPIRES_IN` | — | `1h` | อายุ access token |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | อายุ refresh token |
| `PORT` | — | `5555` | Port ของ API server |

## Prisma Commands

```bash
# เปิด Prisma Studio (GUI จัดการ DB)
npx prisma studio

# สร้าง migration ใหม่
npx prisma migrate dev --name <migration_name>

# Generate Prisma Client หลังแก้ schema
npx prisma generate
```

## License

UNLICENSED — Private project
