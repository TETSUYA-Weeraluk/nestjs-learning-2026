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
import { UpdateUserDto } from './dto/update-user.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  FindAllUserResponseDto,
  UserResponseDto,
} from './dto/response-user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Auth } from 'src/common/decorators/auth.decorator';
import { USER_ROLE } from 'src/generated/prisma/enums';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  @ZodSerializerDto(UserResponseDto)
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
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ZodSerializerDto(UserResponseDto)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ZodSerializerDto(UserResponseDto)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
