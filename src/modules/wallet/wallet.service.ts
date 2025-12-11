import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class WalletService extends PrismaClient {
  private readonly paystackSecretKey: string;
  private readonly paystackWebhookSecret: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly appUrl: string;

  constructor(private config: ConfigService) {
    super();
    const appConfig = this.config.get<AppConfig>('app');
    if (!appConfig) {
      throw new Error('App configuration not found');
    }
    this.paystackSecretKey = appConfig.paystackSecretKey;
    this.paystackWebhookSecret = appConfig.paystackSecretKey;
    this.appUrl = appConfig.paystackcallbackUrl;
  }

  // ==================== DEPOSIT OPERATIONS ====================

  // Initialize deposit transaction with Paystack
  async initiateDeposit(userId: string, amount: number, email: string) {
    // Ensure wallet exists
    await this.getOrCreateWallet(userId);

    // Generate unique reference
    const reference = `dep_${Date.now()}_${userId}`;

    // Amount must be in kobo (smallest currency unit)
    const amountInKobo = amount * 100;

    try {
      // Call Paystack Initialize Transaction API
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email,
          amount: amountInKobo,
          reference,
          callback_url: `${this.appUrl}`,
          metadata: {
            user_id: userId,
            transaction_type: 'deposit',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Create pending transaction in database
      await this.transaction.create({
        data: {
          reference,
          userId,
          amount,
          type: 'deposit',
          status: 'pending',
          paystackReference: response.data.data.access_code,
        },
      });

      return {
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  // ==================== WEBHOOK OPERATIONS ====================

  // Verify Paystack signature
  verifyPaystackSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.paystackWebhookSecret || this.paystackSecretKey;
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  // Handle Paystack webhook (IDEMPOTENT)
  async handleWebhook(event: string, data: any) {
    // Only process charge events (both success and failure)
    if (!event.startsWith('charge.')) {
      return { status: true, message: 'Event ignored' };
    }

    const { reference, amount, status, gateway_response } = data;

    // Verify transaction exists
    const transaction = await this.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // IDEMPOTENCY CHECK
    if (transaction.status === 'success' || transaction.status === 'failed') {
      return { status: true, message: 'Already processed' };
    }

    // Determine if the payment was successful
    const isPaymentSuccessful =
      event === 'charge.success' && status === 'success';

    // Use database transaction to ensure atomicity
    await this.$transaction(async (tx) => {
      // Update transaction status
      await tx.transaction.update({
        where: { reference },
        data: {
          status: isPaymentSuccessful ? 'success' : 'failed',
          gatewayResponse: gateway_response,
          completedAt: new Date(),
        },
      });

      // Credits wallet only if payment was successful
      if (isPaymentSuccessful) {
        // Convert from kobo to naira
        const amountInNaira = amount / 100;

        await tx.wallet.upsert({
          where: { userId: transaction.userId },
          create: {
            userId: transaction.userId,
            balance: amountInNaira,
          },
          update: {
            balance: {
              increment: amountInNaira,
            },
          },
        });
      }
      // For failed transactions, we don't need to do anything else
      // The transaction status is already updated to 'failed'
    });

    return { status: true };
  }

  // ==================== VERIFICATION OPERATIONS ====================

  // Verify deposit with Paystack API and update local status
  async verifyDepositWithPaystack(reference: string) {
    // First check if transaction exists in our database
    const transaction = await this.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    try {
      // Call Paystack Verify Transaction API
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const paystackData = response.data.data;
      const paystackStatus = paystackData.status;
      const paystackAmount = paystackData.amount / 100; // Convert from kobo to naira

      // If the transaction is already successful in our database, just return the status
      if (transaction.status === 'success') {
        return {
          reference: transaction.reference,
          status: transaction.status,
          amount: transaction.amount,
          paystackStatus,
          message: 'Transaction already processed',
        };
      }

      // If Paystack confirms the transaction is successful, update our database and credit wallet
      if (paystackStatus === 'success') {
        await this.$transaction(async (tx) => {
          // Update transaction status
          await tx.transaction.update({
            where: { reference },
            data: {
              status: 'success',
              gatewayResponse: paystackData.gateway_response,
              completedAt: new Date(),
            },
          });

          // Credit the user's wallet
          await tx.wallet.upsert({
            where: { userId: transaction.userId },
            create: {
              userId: transaction.userId,
              balance: paystackAmount,
            },
            update: {
              balance: {
                increment: paystackAmount,
              },
            },
          });
        });

        return {
          reference: transaction.reference,
          status: 'success',
          amount: paystackAmount,
          paystackStatus,
          message: 'Payment verified and wallet credited',
        };
      } else {
        // If Paystack status is not successful, update our database
        await this.transaction.update({
          where: { reference },
          data: {
            status: 'failed',
            gatewayResponse:
              paystackData.gateway_response || 'Payment not completed',
            completedAt: new Date(),
          },
        });

        return {
          reference: transaction.reference,
          status: 'failed',
          amount: transaction.amount,
          paystackStatus,
          message: 'Payment failed',
        };
      }
    } catch (error) {
      console.error('Error verifying deposit with Paystack:', error);
      if (error.response?.status === 404) {
        await this.transaction.update({
          where: { reference },
          data: {
            status: 'failed',
            gatewayResponse: 'Transaction abandoned or not completed',
            completedAt: new Date(),
          },
        });

        return {
          reference,
          status: 'failed',
          amount: transaction.amount,
          message: 'Payment was abandoned',
        };
      }

      return {
        reference,
        status: 'pending',
        amount: transaction.amount,
        message: 'Unable to verify payment status. Please try again.',
      };
    }
  }

  // Verify deposit status manually (doesn't credit wallet)
  async verifyDepositStatus(reference: string) {
    const transaction = await this.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  // ==================== WALLET OPERATIONS ====================

  // Generate unique wallet number (10-13 digits)
  private generateWalletNumber(): string {
    // Generate 12-digit number
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    return timestamp + random;
  }

  // Create or get wallet (auto-creates if doesn't exist)
  async getOrCreateWallet(userId: string) {
    let wallet = await this.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Generate unique wallet number with retry logic
      let walletNumber: string = '';
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        walletNumber = this.generateWalletNumber();

        // Check if wallet number already exists
        const exists = await this.wallet.findUnique({
          where: { walletNumber },
        });

        if (!exists) {
          break;
        }
        attempts++;
      }

      if (attempts === maxAttempts) {
        throw new BadRequestException(
          'Failed to generate unique wallet number',
        );
      }

      // Create wallet
      wallet = await this.wallet.create({
        data: {
          userId,
          walletNumber,
          balance: 0,
        },
      });
    }

    return wallet;
  }

  // Get wallet balance (auto-creates wallet if doesn't exist)
  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      balance: wallet.balance,
      wallet_number: wallet.walletNumber,
    };
  }

  // Get wallet details
  async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      wallet_number: wallet.walletNumber,
      balance: wallet.balance,
      created_at: wallet.createdAt,
    };
  }

  // ==================== TRANSFER OPERATIONS ====================

  // Transfer between wallets
  async transfer(fromUserId: string, toWalletNumber: string, amount: number) {
    // Validate amount first
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Find recipient by wallet number
    const recipientWallet = await this.wallet.findUnique({
      where: { walletNumber: toWalletNumber },
    });

    if (!recipientWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    // Check sender's balance
    const senderWallet = await this.wallet.findUnique({
      where: { userId: fromUserId },
    });

    if (!senderWallet || senderWallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const transferData = `${fromUserId}_${toWalletNumber}_${amount}`;
    const idempotencyKey = `idf_${crypto.createHash('sha256').update(transferData).digest('hex').substring(0, 16)}`;

    // ATOMIC TRANSFER using database transaction
    const result = await this.$transaction(async (tx) => {
      //  to prevent race conditions
      const existingTransfer = await tx.transaction.findFirst({
        where: {
          metadata: {
            path: ['idempotency_key'],
            equals: idempotencyKey,
          },
          status: 'success',
        },
      });

      if (existingTransfer) {
        return {
          isDuplicate: true,
          reference: existingTransfer.reference,
        };
      }

      // Get balance  for optimistic locking
      const freshSenderWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
      });

      if (!freshSenderWallet || freshSenderWallet.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Deducting from sender with optimistic locking using fresh balance
      await tx.wallet.update({
        where: {
          userId: fromUserId,
          balance: freshSenderWallet.balance,
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Add to recipient
      await tx.wallet.update({
        where: { walletNumber: toWalletNumber },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Generate unique transaction references
      const timestamp = Date.now();
      const senderReference = `txf_${timestamp}_${fromUserId}`;
      const recipientReference = `txf_${timestamp}_${recipientWallet.userId}`;

      // save transactions with idempotency key
      await tx.transaction.createMany({
        data: [
          {
            userId: fromUserId,
            type: 'transfer_out',
            amount: -amount,
            status: 'success',
            reference: senderReference,
            metadata: {
              to: toWalletNumber,
              idempotency_key: idempotencyKey,
            },
          },
          {
            userId: recipientWallet.userId,
            type: 'transfer_in',
            amount: amount,
            status: 'success',
            reference: recipientReference,
            metadata: {
              from: senderWallet.walletNumber,
              idempotency_key: idempotencyKey,
            },
          },
        ],
      });

      return {
        isDuplicate: false,
        senderReference,
        recipientReference,
      };
    });

    if (result.isDuplicate) {
      return {
        status: 'success',
        message: 'Transfer already processed',
        reference: result.reference,
      };
    }

    return {
      status: 'success',
      message: 'Transfer completed',
      reference: result.senderReference,
    };
  }

  // ==================== TRANSACTION HISTORY ====================

  // Get transaction history
  async getTransactionHistory(userId: string) {
    const transactions = await this.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        amount: true,
        status: true,
        createdAt: true,
        reference: true,
      },
    });

    return transactions;
  }
}
