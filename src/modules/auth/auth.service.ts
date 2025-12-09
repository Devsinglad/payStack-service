import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { buildSuccessResponse } from 'src/common/utils/api-response';

@Injectable()
export class AuthService extends PrismaClient {
  constructor(private jwtService: JwtService) {
    super();
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return buildSuccessResponse('Login successful', {
      access_token: this.jwtService.sign(payload),
      user,
    });
  }

  async findByEmail(email: string) {
    const user = await this.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async addGoogleId(userId: string, googleId: string) {
    const updatedUser = await this.user.update({
      where: { id: userId },
      data: { googleId },
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async createFromGoogle(userData: {
    email: string;
    fullName: string;
    googleId: string;
    profileImage?: string;
  }) {
    try {
      // Validate input data
      if (!userData.email || !userData.fullName || !userData.googleId) {
        throw new Error('Missing required user data from Google');
      }

      // Check if user already exists with this email
      const existingUser = await this.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if user already exists with this Google ID
      const existingGoogleUser = await this.user.findUnique({
        where: { googleId: userData.googleId },
      });

      if (existingGoogleUser) {
        throw new Error('User with this Google account already exists');
      }

      const newUser = await this.user.create({
        data: {
          email: userData.email,
          fullName: userData.fullName,
          googleId: userData.googleId,
          profileImage: userData.profileImage,
        },
      });

      const { password, ...result } = newUser;
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create user from Google: ${error.message}`);
      }
      throw new Error('Failed to create user from Google');
    }
  }

  async findAll() {
    const users = await this.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        googleId: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        googleId: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
