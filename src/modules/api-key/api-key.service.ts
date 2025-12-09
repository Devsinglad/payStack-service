import { Injectable } from '@nestjs/common';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyService {
  async create(createApiKeyDto: CreateApiKeyDto) {
    const { name, permissions, expiresAt } = createApiKeyDto;
    
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    return 'This action adds a new apiKey';
  }

  findAll() {
    return `This action returns all apiKey`;
  }

  findOne(id: number) {
    return `This action returns a #${id} apiKey`;
  }

  remove(id: number) {
    return `This action removes a #${id} apiKey`;
  }
  private generateApiKey(): string {
    const prefix = 'sk_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }
}
