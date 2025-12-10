# Paystack Service API

A NestJS-based service for managing payments, wallets, and transactions using Paystack payment gateway.

## Description

This service provides a comprehensive API for handling financial operations including:

- User authentication with JWT and API keys
- Wallet management
- Deposit and withdrawal transactions
- Fund transfers between wallets
- Transaction history
- Paystack webhook handling

## Features

- **Authentication**: Dual authentication support using JWT tokens and API keys with role-based permissions
- **Wallet Management**: Create, view balance, and manage user wallets
- **Payment Processing**: Integration with Paystack for secure payment processing
- **Transaction History**: Complete audit trail of all financial activities
- **Webhook Support**: Real-time payment status updates via Paystack webhooks
- **API Documentation**: Comprehensive Swagger documentation at `/docs`

## Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with API key support
- **Payment Gateway**: Paystack
- **Documentation**: Swagger/OpenAPI

## API Endpoints

### Authentication

- `POST /auth/login` - User login with JWT
- `POST /auth/google` - Google OAuth authentication
- `GET /auth/profile` - Get user profile
- `POST /api-key` - Create new API key
- `POST /api-key/rollover` - Rollover expired API key
- `GET /api-key` - List all API keys
- `DELETE /api-key/:id` - Deactivate API key

### Wallet Operations

- `POST /wallet/deposit` - Initiate deposit
- `GET /wallet/balance` - Get wallet balance
- `GET /wallet/details` - Get wallet details
- `POST /wallet/transfer` - Transfer funds
- `GET /wallet/transactions` - Get transaction history

### Webhooks & Callbacks

- `POST /wallet/paystack/webhook` - Paystack webhook handler
- `GET /wallet/paystack/callback` - Paystack payment callback (https://paystack-service.up.railway.app/wallet/paystack/callback)

## Installation

```bash
# Clone the repository
git clone https://github.com/Devsinglad/payStack-service.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run start:dev
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Paystack
PAYSTACK_SECRET_KEY="your-paystack-secret-key"
PAYSTACK_WEBHOOK_SECRET="your-paystack-webhook-secret"

# Application
PORT=3000
NODE_ENV=development
```

## API Usage

### Authentication

The API supports two authentication methods:

1. **JWT Authentication** (for user-facing endpoints)

   ```bash
   curl -H "Authorization: Bearer <jwt-token>" http://localhost:3000/wallet/balance
   ```

2. **API Key Authentication** (for service-to-service communication)
   ```bash
   curl -H "x-api-key: <api-key>" http://localhost:3000/wallet/balance
   ```

### Example Requests

#### Get Wallet Balance

```bash
# With JWT
curl -X GET \
  -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3000/wallet/balance

# With API Key
curl -X GET \
  -H "x-api-key: <api-key>" \
  http://localhost:3000/wallet/balance
```

#### Initiate Deposit

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: <api-key>" \
  -d '{
    "amount": 1000,
    "email": "user@example.com"
  }' \
  http://localhost:3000/wallet/deposit
```

#### Transfer Funds

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: <api-key>" \
  -d '{
    "wallet_number": "1234567890",
    "amount": 500
  }' \
  http://localhost:3000/wallet/transfer
```

## API Permissions

API keys support the following permissions:

- `read` - View wallet balance and transaction history
- `deposit` - Initiate deposits
- `transfer` - Transfer funds between wallets

## Database Schema

The application uses the following main entities:

- **User**: User accounts with OAuth integration
- **Wallet**: User wallets with balance tracking
- **ApiKey**: API keys with permissions and expiration
- **Transaction**: Complete transaction audit trail

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm run test

# Build for production
npm run build

# Start production server
npm run start:prod
```

## API Documentation

Once the server is running, visit `http://localhost:3000/docs` to view the interactive Swagger documentation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

- Create an issue in the GitHub repository
- Review the API documentation at `/docs`
- Check the code comments for additional context
