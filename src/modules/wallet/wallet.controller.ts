import * as common from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { Request } from 'express';

@common.Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  // ==================== DEPOSIT ENDPOINTS ====================

  // 1. Wallet Deposit - Requires API Key with 'deposit' permission
  @common.Post('deposit')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('deposit')
  async deposit(@GetUser() user: any, @common.Body() dto: DepositDto) {
    return this.walletService.initiateDeposit(user.id, dto.amount, user.email);
  }

  // 2. Paystack Webhook - NO AUTH (validated by signature)
  @common.Post('paystack/webhook')
  async paystackWebhook(
    @common.Req() req: common.RawBodyRequest<Request>,
    @common.Headers('x-paystack-signature') signature: string,
  ) {
    if (!signature) {
      throw new common.BadRequestException('No signature header');
    }

    // Get raw body as string for signature verification
    const rawBody = req.rawBody?.toString('utf8') || '';

    // Verify signature
    const isValid = this.walletService.verifyPaystackSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new common.BadRequestException('Invalid signature');
    }

    // Parse event
    const payload = JSON.parse(rawBody);
    return this.walletService.handleWebhook(payload.event, payload.data);
  }

  // Paystack Callback - Handles return from Paystack payment page
  @common.Get('paystack/callback')
  async paystackCallback(@common.Query() query: any) {
    // This endpoint handles the redirect from Paystack after payment
    // The actual processing is done via webhook
    // This can be used to show a success/failure page to the user
    const { reference, transaction } = query;

    if (!reference) {
      throw new common.BadRequestException('Missing reference parameter');
    }

    // Verify transaction status
    const status = await this.walletService.verifyDepositStatus(reference);

    return {
      message: 'Payment processed',
      status: status.status,
      reference: status.reference,
      amount: status.amount,
    };
  }

  // 3. Verify Deposit Status - API Key with 'read' permission
  @common.Get('deposit/:reference/status')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('read')
  async verifyDeposit(@common.Param('reference') reference: string) {
    return this.walletService.verifyDepositStatus(reference);
  }

  // ==================== WALLET ENDPOINTS ====================

  // 4. Get Wallet Balance - API Key with 'read' permission
  @common.Get('balance')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('read')
  async getBalance(@GetUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  // 5. Get Wallet Details - API Key with 'read' permission
  @common.Get('details')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('read')
  async getWalletDetails(@GetUser() user: any) {
    return this.walletService.getWalletDetails(user.id);
  }

  // ==================== TRANSFER ENDPOINTS ====================

  // 6. Wallet Transfer - API Key with 'transfer' permission
  @common.Post('transfer')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('transfer')
  async transfer(@GetUser() user: any, @common.Body() dto: TransferDto) {
    return this.walletService.transfer(user.id, dto.wallet_number, dto.amount);
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  // 7. Transaction History - API Key with 'read' permission
  @common.Get('transactions')
  @common.UseGuards(ApiKeyGuard)
  @RequirePermission('read')
  async getTransactions(@GetUser() user: any) {
    return this.walletService.getTransactionHistory(user.id);
  }
}
