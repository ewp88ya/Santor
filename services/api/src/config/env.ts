import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const lnNeuEnabled = process.env.LN_NEU_ENABLED === 'true';

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

const lnNeuApiUrl = process.env.LN_NEU_API_URL?.trim() ?? '';
const lnNeuApiKey = process.env.LN_NEU_API_KEY?.trim() ?? '';
if (lnNeuEnabled && !lnNeuApiUrl) {
  throw new Error('LN_NEU_API_URL is required when LN_NEU_ENABLED=true');
}
if (lnNeuEnabled && lnNeuApiKey.length < 32) {
  throw new Error('LN_NEU_API_KEY must be at least 32 characters when LN_NEU_ENABLED=true');
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: nodeEnv,
  DATABASE_URL: isProduction ? required('DATABASE_URL') : (process.env.DATABASE_URL ?? ''),
  REDIS_URL: isProduction ? required('REDIS_URL') : (process.env.REDIS_URL ?? ''),
  JWT_SECRET: jwtSecret ?? (isProduction ? required('JWT_SECRET') : 'development-secret'),
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '7d',
  SANTOR_INTERNAL_WEBHOOK_SECRET: internalWebhookSecret ?? '',
  LN_NEU_ENABLED: lnNeuEnabled,
  LN_NEU_API_URL: lnNeuApiUrl,
  LN_NEU_API_KEY: lnNeuApiKey,
};
