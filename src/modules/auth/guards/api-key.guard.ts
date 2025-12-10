import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ApiKeyGuard extends PrismaClient implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // Check for API key in headers
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new ForbiddenException('API key is required for this endpoint');
    }

    // Find API key in database
    const apiKeyRecord = await this.apiKey.findFirst({
      where: {
        keyHash: crypto.createHash('sha256').update(apiKey).digest('hex'),
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (!apiKeyRecord) {
      throw new ForbiddenException('Invalid API key');
    }

    // Check if API key has expired
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      throw new BadRequestException('API key has expired');
    }

    // Get app configuration
    const appConfig = this.config.get<AppConfig>('app');
    if (!appConfig) {
      throw new Error('App configuration not found');
    }

    // Check permissions if required
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every((permission) =>
        apiKeyRecord.permissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Update last used timestamp
    await this.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach user and API key info to request
    request.user = {
      id: apiKeyRecord.userId,
      email: apiKeyRecord.user.email,
      isApiKey: true,
      apiKeyId: apiKeyRecord.id,
    };

    return true;
  }
}
