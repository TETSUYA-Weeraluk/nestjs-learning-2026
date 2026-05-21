import { USER_ROLE } from 'src/generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: USER_ROLE;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: USER_ROLE;
  isActive: boolean;
  address?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}
