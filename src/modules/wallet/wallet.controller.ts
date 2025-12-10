import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Headers,
  Body,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { Request } from 'express';
import { buildSuccessResponse } from 'src/common/utils/api-response';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  // ==================== DEPOSIT ENDPOINTS ====================

  @Post('deposit')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @RequirePermission('deposit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a deposit transaction' })
  @ApiResponse({ status: 200, description: 'Deposit initiated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deposit(@GetUser() user: any, @Body() dto: DepositDto) {
    // Use email from DTO if provided, otherwise use email from JWT user
    const email = dto.email || user.email;
    const result = await this.walletService.initiateDeposit(
      user.id,
      dto.amount,
      email,
    );
    return buildSuccessResponse('Deposit initiated successfully', result);
  }

  //====================== PAYSTACK WEBHOOK & CALLBACK ====================
  @Post('paystack/webhook')
  @ApiOperation({ summary: 'Handle Paystack webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid signature' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack signature for verification',
  })
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('No signature header');
    }

    // Get raw body as string for signature verification
    const rawBody = req.rawBody?.toString('utf8') || '';

    // Verify signature
    const isValid = this.walletService.verifyPaystackSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Parse event
    const payload = JSON.parse(rawBody);
    const result = await this.walletService.handleWebhook(
      payload.event,
      payload.data,
    );
    return buildSuccessResponse('Webhook processed successfully', result);
  }

  //====================== PAYSTACK WEBHOOK & CALLBACK END ====================
  @Get('paystack/callback')
  @ApiOperation({ summary: 'Handle Paystack payment callback' })
  @ApiResponse({ status: 200, description: 'Payment callback processed' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing reference' })
  @ApiQuery({
    name: 'reference',
    required: true,
    description: 'Transaction reference',
  })
  @ApiQuery({
    name: 'transaction',
    required: false,
    description: 'Transaction details',
  })
  async paystackCallback(@Query() query: any) {
    const { reference, transaction } = query;

    if (!reference) {
      throw new BadRequestException('Missing reference parameter');
    }

    // Verify transaction status
    const status = await this.walletService.verifyDepositStatus(reference);

    return buildSuccessResponse('Payment processed', {
      status: status.status,
      reference: status.reference,
      amount: status.amount,
    });
  }

  // ==================== DEPOSIT REFRENCE ====================
  @Get('deposit/:reference/status')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiBearerAuth()
  @RequirePermission('read')
  @ApiOperation({ summary: 'Verify deposit transaction status' })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiParam({ name: 'reference', description: 'Transaction reference' })
  async verifyDeposit(@Param('reference') reference: string) {
    const result = await this.walletService.verifyDepositStatus(reference);
    return buildSuccessResponse('Transaction status retrieved', result);
  }

  // ==================== WALLET ENDPOINTS ====================

  @Get('balance')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @RequirePermission('read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getBalance(@GetUser() user: any) {
    const result = await this.walletService.getBalance(user.id);
    return buildSuccessResponse('Wallet balance retrieved', result);
  }

  @Get('details')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @ApiBearerAuth()
  @RequirePermission('read')
  @ApiOperation({ summary: 'Get wallet details' })
  @ApiResponse({ status: 200, description: 'Wallet details retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getWalletDetails(@GetUser() user: any) {
    const result = await this.walletService.getWalletDetails(user.id);
    return buildSuccessResponse('Wallet details retrieved', result);
  }

  // ==================== TRANSFER ENDPOINTS ====================

  @Post('transfer')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @RequirePermission('transfer')
  @ApiBearerAuth()
  async transfer(@GetUser() user: any, @Body() dto: TransferDto) {
    const result = await this.walletService.transfer(
      user.id,
      dto.wallet_number,
      dto.amount,
    );
    return buildSuccessResponse('Transfer completed successfully', result);
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  @Get('transactions')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  @RequirePermission('read')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiBearerAuth()
  async getTransactions(@GetUser() user: any) {
    const result = await this.walletService.getTransactionHistory(user.id);
    return buildSuccessResponse('Transaction history retrieved', result);
  }
}
