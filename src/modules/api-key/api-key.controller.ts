import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Maximum active keys reached' })
  create(@Body() createApiKeyDto: CreateApiKeyDto, @Request() req) {
    return this.apiKeyService.create(createApiKeyDto, req.user.id);
  }

  @Post('rollover')
  @ApiOperation({ summary: 'Rollover an expired API key' })
  @ApiResponse({ status: 201, description: 'API key rollover successful' })
  @ApiResponse({ status: 400, description: 'Bad request or key not expired' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  rollover(@Body() rolloverDto: RolloverApiKeyDto, @Request() req) {
    return this.apiKeyService.rollover(rolloverDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the authenticated user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  findAll(@Request() req) {
    return this.apiKeyService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific API key' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.apiKeyService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an API key' })
  @ApiResponse({ status: 200, description: 'API key deactivated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.apiKeyService.remove(id, req.user.id);
  }
}
