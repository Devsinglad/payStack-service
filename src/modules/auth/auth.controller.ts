import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  buildSuccessResponse,
  ApiResponse,
} from '../../common/utils/api-response';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  //===================== Google Auth Callback =====================//
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req) {
    try {
      if (!req.user) {
        throw new HttpException(
          'Authentication failed',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return this.authService.login(req.user);
    } catch (error) {
      throw new HttpException(
        'Authentication callback failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //===================== Get All Users =====================//
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll(): Promise<ApiResponse> {
    try {
      const users = await this.authService.findAll();
      return buildSuccessResponse('Users retrieved successfully', users);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //===================== Get User by ID =====================//
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findOne(@Param('id') id: string): Promise<ApiResponse> {
    try {
      if (!id) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }
      const user = await this.authService.findOne(id);
      return buildSuccessResponse('User retrieved successfully', user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
