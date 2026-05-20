import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, USER_ROLE } from '../src/generated/prisma/client';

const SALT_ROUNDS = 10;

type SeedUser = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: USER_ROLE;
  address: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

const SEED_USERS: SeedUser[] = [
  {
    email: 'tetsuya@test.com',
    password: 'tetsuya',
    first_name: 'Tetsuya',
    last_name: 'Admin',
    role: 'ADMIN',
    address: {
      address: '123 Sukhumvit Road',
      city: 'Watthana',
      state: 'Bangkok',
      zip: '10110',
      country: 'Thailand',
    },
  },
  {
    email: 'john.doe@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe',
    role: 'USER',
    address: {
      address: '45 Rama IV Road',
      city: 'Bang Rak',
      state: 'Bangkok',
      zip: '10500',
      country: 'Thailand',
    },
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    first_name: 'Jane',
    last_name: 'Smith',
    role: 'MANAGER',
    address: {
      address: '88 Nimman Road',
      city: 'Mueang',
      state: 'Chiang Mai',
      zip: '50200',
      country: 'Thailand',
    },
  },
  {
    email: 'alex.wong@example.com',
    password: 'password123',
    first_name: 'Alex',
    last_name: 'Wong',
    role: 'USER',
    address: {
      address: '12 Beach Road',
      city: 'Pattaya',
      state: 'Chonburi',
      zip: '20150',
      country: 'Thailand',
    },
  },
  {
    email: 'maria.garcia@example.com',
    password: 'password123',
    first_name: 'Maria',
    last_name: 'Garcia',
    role: 'USER',
    address: {
      address: '7 Silicon Valley Blvd',
      city: 'San Jose',
      state: 'California',
      zip: '95110',
      country: 'United States',
    },
  },
];

async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const seedEmails = SEED_USERS.map((user) => user.email);

  await prisma.refreshToken.deleteMany({
    where: { user: { email: { in: seedEmails } } },
  });
  await prisma.address.deleteMany({
    where: { user: { email: { in: seedEmails } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: seedEmails } },
  });

  for (const seedUser of SEED_USERS) {
    const passwordHash = await hashPassword(seedUser.password);

    await prisma.user.create({
      data: {
        email: seedUser.email,
        first_name: seedUser.first_name,
        last_name: seedUser.last_name,
        password: passwordHash,
        role: seedUser.role,
        isActive: true,
        address: {
          create: seedUser.address,
        },
      },
    });

    console.log(`Seeded: ${seedUser.email} (${seedUser.role})`);
  }

  console.log('Seed completed');

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
