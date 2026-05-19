import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { hashPassword } from 'src/auth/hash-password';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { prismaPaginate } from 'src/common/utils/prisma-paginate.util';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(createUserDto: CreateUserDto) {
    const isExit = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (isExit) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        role: createUserDto.role,
        isActive: createUserDto.isActive,
        address: {
          create: createUserDto.address,
        },
        password: passwordHash,
      },
      include: {
        address: true,
      },
    });

    return user;
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

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
