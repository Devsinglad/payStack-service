import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateApiKeyDto, VALID_PERMISSIONS } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  parseExpiration,
  isValidExpirationFormat,
} from 'src/common/utils/expiration_parse';
import { buildSuccessResponse } from 'src/common/utils/api-response';

@Injectable()
export class ApiKeyService extends PrismaClient {
  constructor() {
    super();
  }

  //===================== Create API Key =====================//
  async create(createApiKeyDto: CreateApiKeyDto, userId: string) {
    const { name, permissions, expiry } = createApiKeyDto;

    // Validate expiry format
    if (!isValidExpirationFormat(expiry)) {
      throw new BadRequestException(
        'Invalid expiry format. Must be one of: 1H, 1D, 1M, 1Y',
      );
    }

    // Validate permissions are explicitly assigned and valid
    if (!permissions || permissions.length === 0) {
      throw new BadRequestException('Permissions must be explicitly assigned');
    }

    // Check if all permissions are valid
    const invalidPermissions = permissions.filter(
      (permission) => !VALID_PERMISSIONS.includes(permission),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}. Valid permissions are: ${VALID_PERMISSIONS.join(', ')}`,
      );
    }

    // Checking if user already has 5 active keys
    const activeKeysCount = await this.apiKey.count({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeKeysCount >= 5) {
      throw new ForbiddenException(
        'Maximum 5 active API keys allowed per user',
      );
    }
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Calculating the  expiration date
    const expiresAt = parseExpiration(expiry);

    const newApiKey = await this.apiKey.create({
      data: {
        name,
        keyHash,
        permissions,
        expiresAt,
        userId,
      },
    });

    return buildSuccessResponse('API key created successfully', {
      api_key: apiKey,
      expires_at: expiresAt.toISOString(),
    });
  }

  async rollover(rolloverDto: RolloverApiKeyDto, userId: string) {
    const { expired_key_id, expiry } = rolloverDto;

    // Validate expiry format
    if (!isValidExpirationFormat(expiry)) {
      throw new BadRequestException(
        'Invalid expiry format. Must be one of: 1H, 1D, 1M, 1Y',
      );
    }

    // Find the expired key
    const expiredKey = await this.apiKey.findFirst({
      where: {
        id: expired_key_id,
        userId,
      },
    });

    if (!expiredKey) {
      throw new NotFoundException(
        'API key not found or does not belong to this user',
      );
    }

    // Check if the key is actually expired
    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('API key has not expired yet');
    }

    // Check if user already has 5 active keys
    const activeKeysCount = await this.apiKey.count({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeKeysCount >= 5) {
      throw new ForbiddenException(
        'Maximum 5 active API keys allowed per user',
      );
    }

    // Generate new API key and hash
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Calculate new expiration date
    const expiresAt = parseExpiration(expiry);

    // Validate permissions from expired key
    if (!expiredKey.permissions || expiredKey.permissions.length === 0) {
      throw new BadRequestException(
        'Expired key has no permissions to rollover',
      );
    }

    // Check if all permissions in expired key are still valid
    const invalidPermissions = expiredKey.permissions.filter(
      (permission) => !VALID_PERMISSIONS.includes(permission),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Expired key contains invalid permissions: ${invalidPermissions.join(', ')}. Cannot rollover.`,
      );
    }

    // Create new API key with same permissions
    const newApiKey = await this.apiKey.create({
      data: {
        name: expiredKey.name,
        keyHash,
        permissions: expiredKey.permissions,
        expiresAt,
        userId,
      },
    });

    return buildSuccessResponse('API key rollover successful', {
      api_key: apiKey,
      expires_at: expiresAt.toISOString(),
    });
  }

  async findAll(userId: string) {
    return this.apiKey.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const apiKey = await this.apiKey.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async remove(id: string, userId: string) {
    // Check if key exists and belongs to user
    const apiKey = await this.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Deactivate the key
    await this.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'API key deactivated successfully' };
  }

  private generateApiKey(): string {
    const prefix = 'sk_live_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }
}
