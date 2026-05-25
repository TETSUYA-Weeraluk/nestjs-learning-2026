# NestJS Learning 2026

REST API สำหรับเรียนรู้ NestJS แบบ production-ready ใช้ Feature-based module, Prisma ORM, JWT Authentication พร้อม Refresh Token และ Role-Based Access Control (RBAC)

เอกสารนี้ออกแบบให้ทั้งคนที่คุ้น NestJS และคนที่เพิ่งเริ่ม — มีส่วนอธิบาย **Request Lifecycle**, **การทำงานของ Auth**, และ **โครงสร้างโปรเจกต์** แยกไว้ชัดเจน

---

## สารบัญ

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Fork โปรเจกต์ใหม่](FORK.md)
- [สำหรับผู้เริ่มต้น NestJS](#สำหรับผู้เริ่มต้น-nestjs)
- [Request Lifecycle](#request-lifecycle-ลำดับการทำงานของ-request)
- [Authentication & Authorization Flow](#authentication--authorization-flow)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Success Response](#success-response)
- [Rate Limiting](#rate-limiting)
- [Decorators](#decorators)
- [Error Response](#error-response)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables-reference)
- [Prisma Commands](#prisma-commands)
- [Scripts](#scripts)
- [เพิ่ม Testing (Optional)](#เพิ่ม-testing-optional)

---

## Tech Stack

| หมวด | เทคโนโลยี |
|------|-----------|
| Framework | [NestJS 11](https://nestjs.com/) + TypeScript |
| Database | PostgreSQL 17 |
| ORM | [Prisma 7](https://www.prisma.io/) |
| Validation | [Zod](https://zod.dev/) + [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) |
| Auth | JWT + Passport.js + bcrypt |
| API Docs | Swagger (`/api`) |
| Security | Helmet, CORS, Rate limiting (`@nestjs/throttler`) |

---

## Features

- **Authentication** — Login, Refresh Token (rotation), Logout, Change password
- **Authorization** — Global JWT Guard + Role Guard (`USER`, `ADMIN`, `MANAGER`)
- **Register ปลอดภัย** — role เป็น `USER` เสมอ (ห้ามส่ง `role` ใน body), email ซ้ำ → `409` จาก DB unique constraint
- **Public API** — Decorator `@Public()` สำหรับ route ที่ไม่ต้อง auth
- **User Management** — Register, CRUD, Soft delete, Pagination + Search
- **Consistent Success Response** — ทุก endpoint สำเร็จห่อด้วย `{ success, data, meta? }` ผ่าน global interceptor
- **Global Exception Filter** — Error response รูปแบบเดียวกันทั้ง API
- **HTTP Request Logging** — log method, path, status, duration
- **Docker** — PostgreSQL ผ่าน Docker Compose
- **CORS** — ตั้งค่าผ่าน `CORS_ORIGIN` (default localhost สำหรับ dev)
- **Env validation** — ตรวจสอบตัวแปรสภาพแวดล้อมตอน boot (Zod, fail fast)
- **Prisma lifecycle** — `$connect` / `$disconnect` ตาม module lifecycle
- **API prefix** — routes ภายใต้ `/api/v1` (ปรับได้ด้วย `API_PREFIX`)
- **Rate limiting** — `@nestjs/throttler` (เข้มขึ้นที่ login/refresh/register)
- **Request ID** — header `X-Request-Id` ในทุก request/response
- **Fork-ready** — [FORK.md](./FORK.md) checklist + `pnpm run db:setup` สำหรับ setup หลัง fork

---

## สำหรับผู้เริ่มต้น NestJS

### NestJS คืออะไร?

NestJS เป็น **Node.js framework** ที่ใช้โครงสร้างแบบ **Module → Controller → Service**:

| ชั้น | หน้าที่ | ตัวอย่างในโปรเจกต์ |
|------|---------|-------------------|
| **Module** | รวมส่วนที่เกี่ยวข้อง (DI container) | `CoreModule`, `FeatureModule`, `AuthModule`, `UserModule` |
| **Controller** | รับ HTTP request, เรียก service, ส่ง response | `AuthController`, `UserController` |
| **Service** | Business logic, คุยกับ database | `AuthService`, `UserService` |
| **Provider** | class ที่ inject ได้ (service, guard, strategy) | `PrismaService`, `JwtStrategy` |

### บทบาทของ Module หลัก

| Module | ไฟล์ | หน้าที่ |
|--------|------|---------|
| **AppModule** | `app.module.ts` | Root module — ประกอบ `CoreModule` + `FeatureModule`, ลงทะเบียน middleware |
| **CoreModule** | `common/core/core.module.ts` | Infrastructure ร่วม: Config, Throttler, Prisma, global guards/pipes/filters/interceptors |
| **FeatureModule** | `features/feature.module.ts` | รวม feature modules ทั้งหมด — **เพิ่ม feature ใหม่ที่นี่** |
| **AuthModule / UserModule** | `features/*/` | Business feature แยกตาม domain |

### Dependency Injection (DI)

Nest สร้าง instance ให้และ **inject** เข้า constructor อัตโนมัติ:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
}
```

ไม่ต้อง `new PrismaService()` เอง — Nest จัดการให้

### Global vs Route-level

ใน `CoreModule` มีการตั้งค่าแบบ **global** (มีผลทุก route):

- `ThrottlerGuard` — rate limit ทุก route (override ได้ที่ controller)
- `JwtAuthGuard` — ทุก route ต้องมี JWT ยกเว้น `@Public()`
- `ZodValidationPipe` — validate body/query
- `ZodSerializerInterceptor` — serialize response ตาม Zod schema ของแต่ละ route
- `SuccessResponseInterceptor` — ห่อ success response เป็น `{ success, data, meta? }`
- `GlobalExceptionFilter` — จับ error ทั้งหมด (รวม Prisma P2002/P2025)

`AppModule` ทำหน้าที่เป็น **root module** เท่านั้น — import `CoreModule` + `FeatureModule` และลงทะเบียน `RequestIdMiddleware`

### แผนภาพ Module

```
AppModule                          # Root: middleware + AppController
├── CoreModule                     # Infrastructure ร่วมทั้งแอป
│   ├── ConfigModule (global)
│   ├── ThrottlerModule
│   ├── PrismaModule (global) ──► PrismaService
│   └── Global providers (APP_FILTER, APP_PIPE, APP_INTERCEPTOR, APP_GUARD)
└── FeatureModule                  # รวม feature modules ทั้งหมด
    ├── AuthModule (features/auth)
    │   ├── AuthController
    │   ├── AuthService
    │   └── JwtStrategy
    └── UserModule (features/user)
        ├── UserController
        └── UserService ──► ใช้ PrismaService
```

> **เพิ่ม feature ใหม่:** สร้าง module ใน `src/features/<feature>/` แล้ว import ใน `FeatureModule` — ไม่ต้องแก้ `AppModule`

---

## Request Lifecycle (ลำดับการทำงานของ Request)

เมื่อ client ส่ง HTTP request เข้ามา NestJS ประมวลผลตามลำดับนี้ (จาก [NestJS Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)):

```
1. Middleware          (RequestId → HTTP logger → helmet ใน main.ts / app.module)
        ↓
2. Guards              (ThrottlerGuard → JwtAuthGuard → RolesGuard ถ้ามี)
        ↓
3. Interceptors (ก่อน) (ZodSerializerInterceptor → SuccessResponseInterceptor)
        ↓
4. Pipes               (ZodValidationPipe — validate input)
        ↓
5. Controller Handler  (@Body, @Param, @CurrentUser, ...)
        ↓
6. Interceptors (หลัง) (SuccessResponseInterceptor → ZodSerializerInterceptor)
        ↓
7. Response ออกไป (header X-Request-Id)
```

**ลำดับ Interceptor ตอน response:** `ZodSerializerInterceptor` serialize ข้อมูลจาก handler ก่อน จากนั้น `SuccessResponseInterceptor` ห่อเป็น `{ success, data, meta? }`

### ลำดับ Guard หลายตัว

| ลำดับ | Guard | ลงทะเบียนที่ |
|-------|-------|--------------|
| 1 | `ThrottlerGuard` | `APP_GUARD` ใน `CoreModule` (Global) |
| 2 | `JwtAuthGuard` | `APP_GUARD` ใน `CoreModule` (Global) |
| 3 | `RolesGuard` | `@Auth(...roles)` บน route เฉพาะ |

**Global Guard รันก่อน Route Guard เสมอ** — ดังนั้น JWT ต้องผ่านก่อน แล้วค่อยเช็ค role

### ตัวอย่าง: `GET /api/v1/auth/me`

```
Client ส่ง Authorization: Bearer <access_token>
    ↓
JwtAuthGuard
    → Passport อ่าน JWT จาก header
    → verify signature + expiry
    → เรียก JwtStrategy.validate(payload)  ← Passport เรียกให้เอง (ไม่มีในโค้ดเรา)
    → query user จาก DB ด้วย payload.sub
    → ใส่ผลลัพธ์ลง request.user
    ↓
getProfile(@CurrentUser() user)
    → อ่าน request.user ที่ guard เตรียมไว้แล้ว
    ↓
Response JSON
```

### `validate()` ถูกเรียกเมื่อไหร่?

`JwtStrategy.validate()` **ไม่ได้ถูกเรียกจาก controller โดยตรง** แต่ถูกเรียกโดย **Passport** ภายใน `JwtAuthGuard`:

```
JwtAuthGuard (extends PassportAuthGuard('jwt'))
    → passport.authenticate('jwt')
    → passport-jwt verify token → ได้ payload object
    → JwtStrategy.validate(payload)
    → return value → request.user
```

`payload` คือข้อมูลที่ถอดจาก JWT (สร้างตอน login ด้วย `jwtService.signAsync({ sub, email, role })`)

---

## Authentication & Authorization Flow

### Token คู่

| Token | อายุ | เก็บที่ไหน | ใช้ทำอะไร |
|-------|------|------------|-----------|
| **access_token** | สั้น (default `1h`) | Client เก็บเอง | ส่งใน header `Authorization: Bearer ...` ทุก protected API |
| **refresh_token** | ยาว (default `7d`) | Client เก็บเอง | ใช้กับ `/api/v1/auth/refresh` และ `/api/v1/auth/logout` เท่านั้น |

Refresh token ถูก **hash (SHA-256)** ก่อนเก็บใน DB — ไม่เก็บ plain text

### Flow สรุป

```
Login     → { success, data: { access_token, refresh_token, user } }
Refresh   → token คู่ใหม่ + revoke refresh เก่า (rotation)
Logout    → { success, data: { message } } + revoke refresh_token ใน DB
Change password → อัปเดต password + revoke refresh tokens ทั้งหมดของ user
```

### Sequence: Login → เรียก Protected API

```mermaid
sequenceDiagram
  participant C as Client
  participant AC as AuthController
  participant AS as AuthService
  participant DB as PostgreSQL
  participant G as JwtAuthGuard
  participant S as JwtStrategy

  C->>AC: POST /api/v1/auth/login
  AC->>AS: login()
  AS->>DB: validate user + create RefreshToken
  AS-->>C: { success, data: { access_token, refresh_token, user } }

  C->>G: GET /api/v1/auth/me (Bearer access_token)
  G->>S: validate(payload)
  S->>DB: find user by id
  S-->>G: AuthenticatedUser → request.user
  G-->>C: { success, data: profile }
```

### Role (RBAC)

| Role | สิทธิ์ในโปรเจกต์ |
|------|------------------|
| `USER` | ดู/แก้ profile ตัวเอง, เปลี่ยนรหัสผ่าน |
| `MANAGER` | ดูรายการ user (`GET /api/v1/user`), ดู profile user อื่น |
| `ADMIN` | สิทธิ์ MANAGER + แก้ `role` ของ user, soft delete (`DELETE /api/v1/user/:id`) |

Route ที่ใส่ `@Auth(ADMIN, MANAGER)` ต้อง **login แล้ว** และ **role ตรง** มิฉะนั้นได้ `403 Forbidden`

**Ownership:** `GET/PATCH /api/v1/user/:id` — user ธรรมดาเข้าถึงได้เฉพาะ `id` ของตัวเอง; ADMIN/MANAGER ดู user อื่นได้; เฉพาะ ADMIN แก้ `role` ได้

---

## Project Structure

```
src/
├── main.ts                        # Bootstrap: CORS, prefix, helmet, Swagger, HTTP logger
├── app.module.ts                  # Root module: CoreModule + FeatureModule + RequestId middleware
├── app.controller.ts              # GET /api/v1 (hello)
│
├── features/
│   ├── feature.module.ts          # รวม feature modules — เพิ่ม feature ใหม่ที่นี่
│   ├── auth/
│   │   ├── auth.module.ts         # JWT + Passport setup
│   │   ├── auth.controller.ts     # /api/v1/auth/*
│   │   ├── auth.service.ts        # login, refresh, logout, change-password
│   │   ├── hash-password.ts       # bcrypt hash/compare
│   │   ├── refresh-token.util.ts  # generate + hash refresh token
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── dto/
│   └── user/
│       ├── user.module.ts
│       ├── user.controller.ts     # /api/v1/user/*
│       ├── user.service.ts        # register, CRUD, pagination
│       └── dto/
│
├── common/
│   ├── core/
│   │   └── core.module.ts         # Config, Throttler, Prisma + global providers (guards, pipes, filters)
│   ├── config/
│   │   ├── configuration.ts       # env → config object
│   │   ├── env.schema.ts          # validate env ตอน boot (Zod)
│   │   └── http-exception.filter.ts
│   ├── middleware/
│   │   └── request-id.middleware.ts
│   ├── decorators/
│   │   ├── public.decorator.ts    # @Public()
│   │   ├── auth.decorator.ts      # @Auth(...roles)
│   │   └── current-user.decorator.ts
│   ├── guard/
│   │   ├── jwtAuthGuard.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   └── success-response.interceptor.ts  # ห่อ { success, data, meta? }
│   ├── prisma/
│   │   ├── prisma.module.ts       # @Global()
│   │   └── prisma.service.ts      # $connect / $disconnect lifecycle
│   ├── dto/                       # pagination, paginated response
│   ├── schemas/                   # Zod base schemas
│   ├── types/                     # JwtPayload, AuthenticatedUser, express.d.ts
│   └── utils/
│       └── prisma-paginate.util.ts
│
└── generated/prisma/              # Prisma Client (auto-generated — ห้ามแก้มือ)

prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

> **หมายเหตุ:** โปรเจกต์นี้ไม่รวม test suite ในตัว — ไม่มีโฟลเดอร์ `test/` หรือไฟล์ `*.spec.ts` ถ้า fork ไปแล้วต้องการเพิ่ม test ดูขั้นตอนที่ [เพิ่ม Testing (Optional)](#เพิ่ม-testing-optional)

---

## Getting Started

> **Fork จาก repo นี้ไปโปรเจกต์ใหม่?** ดู checklist ที่ **[FORK.md](./FORK.md)** (เปลี่ยน `JWT_SECRET`, ชื่อ DB, seed, Swagger title ฯลฯ)

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (สำหรับ PostgreSQL)

### 1. Clone & Install

```bash
git clone <repository-url>
cd nestjs-learning-2026
pnpm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

แก้ค่าใน `.env` ให้ตรงกับโปรเจกต์ — โดยเฉพาะ `JWT_SECRET` และ `DATABASE_URL` / `DB_*` (รายละเอียดตัวแปรดูที่ [Environment Variables](#environment-variables-reference))

### 3. Database (ครั้งแรก)

**แบบรวดเดียว** — เปิด PostgreSQL, apply migrations, seed:

```bash
pnpm run db:setup
```

คำสั่งนี้รัน `db:up` → รอ DB พร้อม → `db:migrate` → `db:seed`

**แบบแยกขั้น** (ถ้าต้องการควบคุมเอง):

```bash
pnpm run db:up          # docker compose up -d
pnpm run db:migrate     # prisma migrate deploy
pnpm run db:seed        # ข้อมูลตัวอย่าง dev
```

เมื่อแก้ `prisma/schema.prisma` แล้วต้องการสร้าง migration ใหม่ (development):

```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

หลัง seed สามารถ login ได้ทันที (รันซ้ำได้ — จะลบแล้วสร้างผู้ใช้ชุดเดิมใหม่):

| Email | Password | Role |
|-------|----------|------|
| `tetsuya@test.com` | `tetsuya` | ADMIN |
| `john.doe@example.com` | `password123` | USER |
| `jane.smith@example.com` | `password123` | MANAGER |
| `alex.wong@example.com` | `password123` | USER |
| `maria.garcia@example.com` | `password123` | USER |

### 4. Run Application

```bash
# Development (watch mode)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

| URL | คำอธิบาย |
|-----|----------|
| `http://localhost:5555/api/v1` | API base (global prefix) |
| `http://localhost:5555/api` | Swagger UI |

---

## API Reference

### Auth

| Method | Path | Auth | คำอธิบาย |
|--------|------|------|----------|
| `POST` | `/api/v1/auth/login` | Public | Login (rate limited) |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh token (rotation) |
| `POST` | `/api/v1/auth/logout` | Public | Logout (revoke refresh token) |
| `GET` | `/api/v1/auth/me` | Bearer | ดู profile ตัวเอง |
| `PATCH` | `/api/v1/auth/change-password` | Bearer | เปลี่ยนรหัสผ่าน (revoke refresh tokens) |

**Login**

```bash
curl -X POST http://localhost:5555/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tetsuya@test.com", "password": "tetsuya"}'
```

```json
{
  "success": true,
  "data": {
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
}
```

**เรียก Protected API**

```bash
curl http://localhost:5555/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "USER"
  }
}
```

**Refresh Token**

```bash
curl -X POST http://localhost:5555/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

**Logout**

```bash
curl -X POST http://localhost:5555/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

**Change Password**

```bash
curl -X PATCH http://localhost:5555/api/v1/auth/change-password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "tetsuya", "new_password": "newpassword123"}'
```

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

### User

| Method | Path | Auth | Role | คำอธิบาย |
|--------|------|------|------|----------|
| `POST` | `/api/v1/user` | Public | — | Register (role เป็น `USER` เสมอ, ห้ามส่ง `role`) |
| `GET` | `/api/v1/user` | Bearer | ADMIN, MANAGER | List users (pagination) |
| `GET` | `/api/v1/user/:id` | Bearer | — | Get user (ตนเอง หรือ ADMIN/MANAGER) |
| `PATCH` | `/api/v1/user/:id` | Bearer | — | Update profile (ADMIN เท่านั้นที่แก้ `role` ได้) |
| `DELETE` | `/api/v1/user/:id` | Bearer | ADMIN | Soft delete |

**Register**

- ไม่รับ `role` / `isActive` ใน body (schema แบบ `.strict()`)
- บังคับ `role: USER`, `isActive: true` ใน service
- email ซ้ำ → PostgreSQL unique constraint → Prisma `P2002` → **409 Conflict** (`email มีอยู่ในระบบแล้ว`) — ไม่ต้อง `findUnique` ก่อน create เพราะ DB เป็น source of truth และกัน race condition ได้ดีกว่า

```bash
curl -X POST http://localhost:5555/api/v1/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "password": "password123",
    "first_name": "Jane",
    "last_name": "Doe",
    "address": {
      "address": "123 Main St",
      "city": "Bangkok",
      "state": "Bangkok",
      "zip": "10110",
      "country": "Thailand"
    }
  }'
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "new@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "USER",
    "isActive": true,
    "created_at": "2026-05-20T10:00:00.000Z",
    "updated_at": "2026-05-20T10:00:00.000Z",
    "address": {
      "id": "uuid",
      "address": "123 Main St",
      "city": "Bangkok",
      "state": "Bangkok",
      "zip": "10110",
      "country": "Thailand",
      "updated_at": "2026-05-20T10:00:00.000Z"
    }
  }
}
```

### Pagination (`GET /api/v1/user`)

```
GET /api/v1/user?page=1&limit=10&search=john&sort=created_at&order=desc
```

| Param | Type | Default | คำอธิบาย |
|-------|------|---------|----------|
| `page` | number | — | หน้าที่ต้องการ (ไม่ส่ง = คืนทุกรายการ, `meta.page` เป็น `null`) |
| `limit` | number | `10` | จำนวนต่อหน้า (ใช้เมื่อมี `page` เท่านั้น) |
| `search` | string | — | ค้นหาใน `first_name`, `last_name`, `email` |
| `sort` | string | `created_at` | ฟิลด์: `first_name`, `last_name`, `email`, `created_at` |
| `order` | `asc` \| `desc` | `desc` | ทิศทาง sort |

Response แบบมี pagination (`?page=1`):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "USER",
      "isActive": true,
      "created_at": "2026-05-20T10:00:00.000Z",
      "updated_at": "2026-05-20T10:00:00.000Z",
      "address": { "id": "...", "address": "...", "city": "...", "state": "...", "zip": "...", "country": "...", "updated_at": "..." }
    }
  ],
  "meta": {
    "count": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Response แบบไม่ส่ง `page` (คืนทุกรายการ):

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "count": 5,
    "page": null,
    "limit": null,
    "totalPages": 1
  }
}
```

---

## Success Response

ทุก request ที่สำเร็จ (HTTP 2xx) ผ่าน `SuccessResponseInterceptor` ได้รูปแบบเดียวกัน:

### Endpoint ทั่วไป (object / message)

```json
{
  "success": true,
  "data": { ... }
}
```

ตัวอย่าง:

| Endpoint | `data` ที่ได้ |
|----------|---------------|
| `GET /api/v1` | `"Hello World!"` |
| `GET /api/v1/auth/me` | `{ id, email, first_name, last_name, role }` |
| `GET /api/v1/user/:id` | User object พร้อม `address` |
| `POST /api/v1/auth/login` | `{ access_token, refresh_token, user }` |
| `POST /api/v1/auth/logout` | `{ message: "Logged out successfully" }` |
| `PATCH /api/v1/auth/change-password` | `{ message: "Password changed successfully" }` |

### List endpoint (pagination)

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "count": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

| ฟิลด์ใน `meta` | คำอธิบาย |
|----------------|----------|
| `count` | จำนวน record ทั้งหมดที่ match filter |
| `page` | หน้าปัจจุบัน (`null` เมื่อไม่ส่ง `page`) |
| `limit` | จำนวนต่อหน้า (`null` เมื่อไม่ส่ง `page`) |
| `totalPages` | จำนวนหน้าทั้งหมด |

### ฝั่ง Frontend

```typescript
const res = await fetch('/api/v1/user?page=1', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const body = await res.json();

if (body.success) {
  const users = body.data;       // array ของ users
  const { count, page, limit, totalPages } = body.meta ?? {};
}
```

Error response **ไม่มี** `success` — ใช้ `statusCode` แทน (ดู [Error Response](#error-response))

---

## Rate Limiting

Global limit จาก `THROTTLE_TTL` + `THROTTLE_LIMIT` (default 100 req / 60s) ผ่าน `ThrottlerGuard`

| Route | Limit |
|-------|-------|
| ทั่วไป | 100 / 60s |
| `POST /api/v1/auth/login` | 5 / 60s |
| `POST /api/v1/auth/refresh` | 10 / 60s |
| `POST /api/v1/user` (register) | 10 / 60s |

เกิน limit → **429 Too Many Requests**

---

## Decorators

### `@Public()`

ข้าม `JwtAuthGuard` — route ไม่ต้องส่ง Bearer token

```typescript
@Public()
@Post('login')
login() { ... }
```

### `@Auth(...roles)`

ใช้ร่วมกับ Global JWT Guard:

1. ต้อง login (JWT ผ่าน)
2. `RolesGuard` เช็ค `request.user.role`

```typescript
@Auth(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
@Get()
findAll() { ... }
```

### `@CurrentUser()`

ดึง `request.user` ที่ `JwtStrategy.validate()` ใส่ไว้แล้ว — **ไม่ได้ decode JWT ใน decorator**

```typescript
@Get('me')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return this.authService.getProfile(user);
}
```

---

## Error Response

ทุก error ผ่าน `GlobalExceptionFilter` ได้รูปแบบ (**ไม่มี** `success` — ต่างจาก [Success Response](#success-response)):

```json
{
  "statusCode": 400,
  "message": ["รายละเอียด error"],
  "timestamp": "2026-05-20T10:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| สถานการณ์ | status | หมายเหตุ |
|-----------|--------|----------|
| Validation (Zod) | 400 | `message` เป็น array ของ `{ field, error }` |
| Unauthorized | 401 | JWT ไม่ถูก / หมดอายุ |
| Forbidden | 403 | role ไม่ตรง / แก้ user คนอื่น / non-admin ส่ง `role` |
| Not found (Prisma P2025) | 404 | ข้อความภาษาไทย |
| Duplicate (Prisma P2002) | 409 | เช่น `email มีอยู่ในระบบแล้ว` (register/update email ซ้ำ) |
| Too many requests | 429 | rate limit เกิน |
| Server error | 500 | log ใน server |

ทุก error response มี `requestId` (ตรงกับ header `X-Request-Id`)

---

## Database Schema

```
User ──┬── Address (1:1)
       └── RefreshToken (1:N)

USER_ROLE: USER | ADMIN | MANAGER
```

- **Soft delete** — `DELETE /api/v1/user/:id` ตั้ง `deleted_at` + `isActive: false` ไม่ลบ row จริง
- **Email unique** — soft delete แล้ว email ยัง unique ใน DB; register email เดิมจะได้ `409` (ต้องออกแบบเพิ่มถ้าต้องการสมัครซ้ำ)
- **Password** — hash ด้วย bcrypt (10 salt rounds)

---

## Environment Variables Reference

ตัวอย่างค่าทั้งหมดอยู่ใน [`.env.example`](./.env.example)

| Variable | Required | Default | คำอธิบาย |
|----------|----------|---------|----------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `DB_USER` | — | — | ใช้กับ Docker Compose |
| `DB_PASSWORD` | — | — | ใช้กับ Docker Compose |
| `DB_NAME` | — | — | ใช้กับ Docker Compose |
| `DB_HOST` | — | `localhost` | Database host (ใน configuration) |
| `DB_PORT` | — | `5432` | Database port |
| `JWT_SECRET` | ✅ | — | Secret สำหรับ sign/verify JWT (dev ≥16 ตัว, prod ≥32 ตัว) |
| `JWT_EXPIRES_IN` | — | `1h` | อายุ access token |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | อายุ refresh token (`7d`, `24h`, `30m`) |
| `PORT` | — | `5555` | Port ของ API server |
| `API_PREFIX` | — | `api/v1` | Global route prefix |
| `THROTTLE_TTL` | — | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | — | `100` | Max requests ต่อ window (ทั่วไป) |
| `NODE_ENV` | — | `development` | `development` \| `production` \| `test` (ใช้ตอนรัน Jest) |
| `CORS_ORIGIN` | production | — | Allowed origins คั่นด้วย comma (บังคับใน production) |

---

## Prisma Commands

```bash
# GUI จัดการ database
npx prisma studio

# Apply migrations ที่มีอยู่แล้ว (ใช้ใน db:setup / CI)
pnpm run db:migrate

# สร้าง migration ใหม่หลังแก้ schema (development)
npx prisma migrate dev --name <migration_name>

# Generate client หลังแก้ schema
npx prisma generate
```

---

## Scripts

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `pnpm run db:setup` | เปิด DB + migrate + seed (setup ครั้งแรก) |
| `pnpm run db:up` | เปิด PostgreSQL ผ่าน Docker Compose |
| `pnpm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `pnpm run db:seed` | ใส่ข้อมูลตัวอย่าง (`prisma db seed`) |
| `pnpm run start:dev` | Dev server (hot reload) |
| `pnpm run start:debug` | Dev server พร้อม Node.js debugger |
| `pnpm run start` | รัน server (ไม่ watch) |
| `pnpm run build` | Build โปรเจกต์ |
| `pnpm run start:prod` | รัน production build |
| `pnpm run lint` | ESLint |
| `pnpm run format` | Format โค้ดด้วย Prettier (`src/**/*.ts`) |

---

## เพิ่ม Testing (Optional)

Template นี้ตั้งใจ **ไม่ใส่ test suite** เพื่อให้โฟกัสเรียนรู้ NestJS core ก่อน แต่โค้ดรองรับ `NODE_ENV=test` อยู่แล้วใน `env.schema.ts` — ถ้า fork ไปแล้วอยากเพิ่ม test ทำตามขั้นตอนนี้ได้

### ภาพรวม

| ประเภท | ไฟล์ | ใช้ทดสอบอะไร | ต้องมี DB จริงไหม |
|--------|------|---------------|------------------|
| **Unit test** | `src/**/*.spec.ts` | Service, Controller แยกส่วน (mock dependency) | ไม่ต้อง |
| **E2E test** | `test/**/*.e2e-spec.ts` | HTTP request ผ่าน app ทั้งก้อน | ต้อง (PostgreSQL) |

### 1. ติดตั้ง dependencies

```bash
pnpm add -D jest ts-jest @types/jest @nestjs/testing supertest @types/supertest
```

### 2. เพิ่ม scripts และ Jest config ใน `package.json`

เพิ่มใน `scripts`:

```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage",
"test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
"test:e2e": "jest --config ./test/jest-e2e.json"
```

เพิ่ม block `jest` ท้ายไฟล์ (unit test — สแกน `src/**/*.spec.ts`):

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "setupFiles": ["<rootDir>/../test/setup-env.ts"],
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/$1"
  }
}
```

ปรับ `format` / `lint` ให้รวมโฟลเดอร์ test:

```json
"format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
```

### 3. สร้างไฟล์ config สำหรับ test

**`test/setup-env.ts`** — โหลด env ก่อนรัน test (ค่า default สำหรับ local):

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://admin:admin@localhost:5432/nestjs2026-learning';
process.env.JWT_SECRET ??= 'test-jwt-secret-min-16-chars';
```

> แก้ `DATABASE_URL` ให้ตรงกับ `.env` / Docker Compose ของโปรเจกต์ fork แนะนำใช้ **database แยก** สำหรับ test (เช่น `nestjs2026_test`) เพื่อไม่ชน seed ของ dev

**`test/jest-e2e.json`** — config แยกสำหรับ E2E:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "setupFiles": ["<rootDir>/setup-env.ts"],
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### 4. สร้าง test ตัวอย่าง

**Unit test** — วางคู่กับไฟล์ที่ทดสอบ เช่น `src/app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET / should return hello message', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
});
```

**E2E test** — `test/app.e2e-spec.ts` (ต้องเปิด PostgreSQL + migrate ก่อน):

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    app.setGlobalPrefix(configService.getOrThrow<string>('api.prefix'));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect({
        success: true,
        data: 'Hello World!',
      });
  });
});
```

### 5. ปรับ config อื่น ๆ

| ไฟล์ | สิ่งที่เพิ่ม |
|------|------------|
| `eslint.config.mjs` | `...globals.jest` ใน `languageOptions.globals` |
| `tsconfig.build.json` | `"exclude": ["node_modules", "test", "dist", "**/*spec.ts"]` |
| `.gitignore` | `coverage/` และ `.nyc_output/` |

### 6. รัน test

```bash
# Unit tests (ไม่ต้องมี DB)
pnpm run test
pnpm run test:watch
pnpm run test:cov

# E2E (ต้องมี PostgreSQL พร้อม migrate แล้ว)
pnpm run db:up
pnpm run db:migrate
pnpm run test:e2e
```

### แนวทางเขียน test ในโปรเจกต์นี้

- **Unit test สำหรับ Service** — mock `PrismaService` ด้วย `useValue` แทนการต่อ DB จริง
- **Unit test สำหรับ Auth/User** — mock `JwtService`, `ConfigService` ตาม dependency ของ service นั้น
- **E2E ที่ต้อง auth** — login ผ่าน `POST /api/v1/auth/login` แล้วอ่าน `body.data.access_token` ส่งใน `Authorization: Bearer <token>`
- **E2E ที่ซับซ้อนขึ้น** — อาจแยก helper bootstrap จาก `main.ts` (CORS, helmet, validation pipe) ให้ E2E ใช้ setup เดียวกับ production
- **Nest CLI** — สร้าง spec อัตโนมัติได้ด้วย `nest g service user --spec` หรือ `nest g controller user --spec`

---

## แนวทางพัฒนาเพิ่ม Feature ใหม่

1. แก้ `prisma/schema.prisma` แล้ว `npx prisma migrate dev`
2. สร้างโฟลเดอร์ `src/features/<feature>/` (module, controller, service, dto)
3. **import module ใน `FeatureModule`** (`src/features/feature.module.ts`) — ไม่ต้องแก้ `AppModule`
4. ใช้ `PrismaService` inject ใน service (ได้จาก global `PrismaModule` ใน `CoreModule`)
5. กำหนด `@Public()` / `@Auth()` / `@Throttle()` ตามความต้องการ
6. สร้าง Zod DTO ด้วย `createZodDto` + `@ZodSerializerDto` สำหรับ response
7. List endpoint ใช้ `prismaPaginate` — คืน `{ data, meta }` แล้ว interceptor จะห่อเป็น `{ success, data, meta }` ให้อัตโนมัติ
8. Route ใหม่จะอยู่ภายใต้ global prefix `/api/v1` อัตโนมัติ (ยกเว้น Swagger ที่ `/api`)

**ตัวอย่าง — เพิ่ม `ProductModule`:**

```typescript
// src/features/feature.module.ts
@Module({
  imports: [AuthModule, UserModule, ProductModule], // ← เพิ่มที่นี่
})
export class FeatureModule {}
```

---

## License

[MIT](./LICENSE) — ใช้ fork และแก้ไขได้อย่างอิสระ โดยต้องเก็บ copyright notice ไว้
