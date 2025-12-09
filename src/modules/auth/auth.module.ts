import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt.guard';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    GoogleAuthGuard,
    JwtAuthGuard,
  ],
  exports: [AuthService, GoogleAuthGuard, JwtAuthGuard],
})
export class AuthModule {}
