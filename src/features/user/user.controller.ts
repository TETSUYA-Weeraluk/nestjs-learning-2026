import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthResponseDto } from 'src/features/auth/dto/auth-response.dto';
import {
  FindAllUserResponseDto,
  UserResponseDto,
} from './dto/response-user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/types/jwt-payload.type';
import { USER_ROLE } from 'src/generated/prisma/enums';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @ZodSerializerDto(AuthResponseDto)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Auth(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @Get()
  @ZodSerializerDto(FindAllUserResponseDto)
  findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @ZodSerializerDto(UserResponseDto)
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.userService.findOne(id, actor);
  }

  @Patch(':id')
  @ZodSerializerDto(UserResponseDto)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: AdminUpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.userService.update(id, updateUserDto, actor);
  }

  @Auth(USER_ROLE.ADMIN)
  @Delete(':id')
  @ZodSerializerDto(UserResponseDto)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
