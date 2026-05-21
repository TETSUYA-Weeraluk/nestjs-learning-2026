import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { comparePassword, hashPassword } from './hash-password';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedUser } from 'src/common/types/jwt-payload.type';
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
} from './refresh-token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    return this.issueTokensForUser(user);
  }

  async issueTokensForUser(user: AuthenticatedUser) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toAuthUser(user),
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = hashRefreshToken(refreshTokenDto.refresh_token);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            isActive: true,
            deleted_at: true,
            address: true,
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revoked_at ||
      storedToken.expiresAt < new Date() ||
      !storedToken.user.isActive ||
      storedToken.user.deleted_at
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user: AuthenticatedUser = {
      id: storedToken.user.id,
      email: storedToken.user.email,
      first_name: storedToken.user.first_name,
      last_name: storedToken.user.last_name,
      role: storedToken.user.role,
      isActive: storedToken.user.isActive,
      address: {
        address: storedToken.user.address?.address ?? '',
        city: storedToken.user.address?.city ?? '',
        state: storedToken.user.address?.state ?? '',
        zip: storedToken.user.address?.zip ?? '',
        country: storedToken.user.address?.country ?? '',
      },
    };

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.rotateRefreshToken(storedToken.id, user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toAuthUser(user),
    };
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = hashRefreshToken(refreshTokenDto.refresh_token);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    return { message: 'Logged out successfully' };
  }

  getProfile(user: AuthenticatedUser) {
    return this.toAuthUser(user);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, deleted_at: null },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await comparePassword(
      changePasswordDto.current_password,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await hashPassword(changePasswordDto.new_password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    return { message: 'Password changed successfully' };
  }

  private async validateUser(email: string, plainPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true, deleted_at: null },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        isActive: true,
        password: true,
        deleted_at: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isActive: user.isActive,
    };
  }

  private async createRefreshToken(userId: string) {
    const refreshToken = generateRefreshToken();
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refreshToken),
        userId,
        expiresAt: getRefreshTokenExpiry(refreshExpiresIn),
      },
    });

    return refreshToken;
  }

  private async rotateRefreshToken(storedTokenId: string, userId: string) {
    const refreshToken = generateRefreshToken();
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedTokenId },
        data: { revoked_at: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: hashRefreshToken(refreshToken),
          userId,
          expiresAt: getRefreshTokenExpiry(refreshExpiresIn),
        },
      }),
    ]);

    return refreshToken;
  }

  private signAccessToken(user: AuthenticatedUser) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private toAuthUser(user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      address: user.address,
    };
  }
}
