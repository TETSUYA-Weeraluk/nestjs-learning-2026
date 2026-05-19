import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { hashPassword } from 'src/auth/hash-password';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(createUserDto: CreateUserDto) {
    console.log('createUserDto', createUserDto);
    const isExit = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (isExit) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hashPassword(createUserDto.password);

    console.log('passwordHash', passwordHash);

    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
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
