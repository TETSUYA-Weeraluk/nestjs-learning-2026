import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserInput } from './dto/update-user.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { hashPassword } from 'src/features/auth/hash-password';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { prismaPaginate } from 'src/common/utils/prisma-paginate.util';
import { AuthenticatedUser } from 'src/common/types/jwt-payload.type';
import { USER_ROLE } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const passwordHash = await hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        role: USER_ROLE.USER,
        isActive: true,
        address: {
          create: createUserDto.address,
        },
        password: passwordHash,
      },
      include: {
        address: true,
      },
    });

    return this.authService.issueTokensForUser({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isActive: user.isActive,
      address: {
        address: user.address?.address ?? '',
        city: user.address?.city ?? '',
        state: user.address?.state ?? '',
        zip: user.address?.zip ?? '',
        country: user.address?.country ?? '',
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    return prismaPaginate(this.prisma.user, query, {
      searchFields: ['first_name', 'last_name', 'email'],
      allowedSortFields: ['first_name', 'last_name', 'email', 'created_at'],
      include: { address: true },
      where: {
        deleted_at: null,
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    this.assertCanViewUser(actor, id);
    return this.prisma.user.findFirstOrThrow({
      where: { id, deleted_at: null },
      include: { address: true },
    });
  }

  async update(
    id: string,
    updateUserDto: AdminUpdateUserInput,
    actor: AuthenticatedUser,
  ) {
    this.assertCanModifyUser(actor, id);

    if (updateUserDto.role !== undefined && actor.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Only administrators can update user roles');
    }

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.first_name !== undefined) {
      data.first_name = updateUserDto.first_name;
    }
    if (updateUserDto.last_name !== undefined) {
      data.last_name = updateUserDto.last_name;
    }
    if (updateUserDto.email !== undefined) {
      data.email = updateUserDto.email;
    }
    if (updateUserDto.role !== undefined && actor.role === USER_ROLE.ADMIN) {
      data.role = updateUserDto.role;
    }
    if (
      updateUserDto.address &&
      Object.keys(updateUserDto.address).length > 0
    ) {
      data.address = { update: updateUserDto.address };
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { address: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        isActive: false,
      },
      include: { address: true },
    });
  }

  private assertCanViewUser(
    actor: AuthenticatedUser,
    targetUserId: string,
  ): void {
    if (this.isPrivileged(actor)) {
      return;
    }
    if (actor.id !== targetUserId) {
      throw new ForbiddenException('You can only access your own profile');
    }
  }

  private assertCanModifyUser(
    actor: AuthenticatedUser,
    targetUserId: string,
  ): void {
    if (actor.role === USER_ROLE.ADMIN) {
      return;
    }
    if (actor.id !== targetUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }
  }

  private isPrivileged(actor: AuthenticatedUser): boolean {
    return actor.role === USER_ROLE.ADMIN || actor.role === USER_ROLE.MANAGER;
  }
}
