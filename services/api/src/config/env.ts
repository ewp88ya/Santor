import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const jwtSecret = process.env.JWT_SECRET?.trim();
if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

const internalWebhookSecret = process.env.SANTOR_INTERNAL_WEBHOOK_SECRET?.trim();
if (isProduction && (!internalWebhookSecret || internalWebhookSecret.length < 32)) {
  throw new Error('SANTOR_INTERNAL_WEBHOOK_SECRET must be at least 32 characters in production');
}

const lnNeuBaseUrl = process.env.LN_NEU_BASE_URL?.trim();
const santorApiKey = process.env.SANTOR_API_KEY?.trim();
if (isProduction && !lnNeuBaseUrl) {
  throw new Error('LN_NEU_BASE_URL is required in production');
}
if (isProduction && (!santorApiKey || santorApiKey.length < 32)) {
  throw new Error('SANTOR_API_KEY must be at least 32 characters in production');
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: nodeEnv,
  DATABASE_URL: isProduction ? required('DATABASE_URL') : (process.env.DATABASE_URL ?? ''),
  REDIS_URL: isProduction ? required('REDIS_URL') : (process.env.REDIS_URL ?? ''),
  JWT_SECRET: jwtSecret ?? (isProduction ? required('JWT_SECRET') : 'development-secret'),
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '7d',
  SANTOR_INTERNAL_WEBHOOK_SECRET: internalWebhookSecret ?? '',
  LN_NEU_BASE_URL: lnNeuBaseUrl ?? '',
  SANTOR_API_KEY: santorApiKey ?? '',
  LN_NEU_TIMEOUT_MS: Number(process.env.LN_NEU_TIMEOUT_MS ?? 10000),
  LN_NEU_RETRIES: Number(process.env.LN_NEU_RETRIES ?? 2),
};
