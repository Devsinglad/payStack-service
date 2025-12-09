import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  corsOrigins: string[] | boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  databaseUrl: string;
  appUrl: string;
  paystackSecretKey: string;
}

const parseCorsOrigins = (origins: string | undefined): string[] | boolean => {
  if (!origins) return true;
  if (origins === '*') return true;
  return origins.split(',').map((origin) => origin.trim());
};

export default registerAs<AppConfig>('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  jwtSecret: process.env.JWT_SECRET ?? 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    'http://localhost:3000/auth/google/callback',
  databaseUrl: process.env.DATABASE_URL ?? '',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
}));
