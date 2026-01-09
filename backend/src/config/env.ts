import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // App
  NODE_ENV: string;
  PORT: number;

  // Database
  DATABASE_URL: string;
  REDIS_URL: string;

  // Security
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  ENCRYPTION_KEY: string;

  // BingX
  BINGX_API_KEY: string;
  BINGX_SECRET_KEY: string;
  BINGX_REFERRER_ID: string;
  BINGX_API_URL: string;
  BINGX_USE_TESTNET: boolean;

  // Email (SMTP)
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;

  // External APIs
  COINGECKO_API_KEY?: string;
  COINGECKO_API_URL: string;
  COINGLASS_API_KEY?: string;
  COINGLASS_API_URL: string;
  FEAR_GREED_API_URL: string;
  BINANCE_API_URL: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  TRADING_RATE_LIMIT_WINDOW_MS: number;
  TRADING_RATE_LIMIT_MAX: number;

  // CORS
  CORS_ORIGINS: string[];

  // Trading Bot
  ICT_CONFIDENCE_THRESHOLD: number;
  ICT_MAX_POSITION_SIZE_PERCENT: number;
  ICT_DEFAULT_LEVERAGE: number;
  ICT_STOP_LOSS_PERCENT: number;
  ICT_TAKE_PROFIT_RATIO: number;
  SNIPER_PUMP_THRESHOLD: number;
  SNIPER_DUMP_THRESHOLD: number;
  SNIPER_LIQUIDATION_THRESHOLD: number;
  MAX_DAILY_LOSS_PERCENT: number;
  MAX_OPEN_POSITIONS: number;
  PAPER_TRADING_MODE: boolean;

  // Cache TTL (seconds)
  CACHE_PRICE_DATA_TTL: number;
  CACHE_LIQUIDATION_DATA_TTL: number;
  CACHE_FUNDING_RATES_TTL: number;

  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: string;
}

const config: Config = {
  // App
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',

  // BingX
  BINGX_API_KEY: process.env.BINGX_API_KEY || '',
  BINGX_SECRET_KEY: process.env.BINGX_SECRET_KEY || '',
  BINGX_REFERRER_ID: process.env.BINGX_REFERRER_ID || '',
  BINGX_API_URL: process.env.BINGX_API_URL || 'https://open-api.bingx.com',
  BINGX_USE_TESTNET: process.env.BINGX_USE_TESTNET === 'true',

  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'FLAXU <info@flaxu.io>',

  // External APIs
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  COINGECKO_API_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  COINGLASS_API_KEY: process.env.COINGLASS_API_KEY,
  COINGLASS_API_URL: process.env.COINGLASS_API_URL || 'https://open-api.coinglass.com/public/v2',
  FEAR_GREED_API_URL: process.env.FEAR_GREED_API_URL || 'https://api.alternative.me/fng/',
  BINANCE_API_URL: process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  TRADING_RATE_LIMIT_WINDOW_MS: parseInt(process.env.TRADING_RATE_LIMIT_WINDOW_MS || '60000', 10),
  TRADING_RATE_LIMIT_MAX: parseInt(process.env.TRADING_RATE_LIMIT_MAX || '10', 10),

  // CORS
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Trading Bot
  ICT_CONFIDENCE_THRESHOLD: parseInt(process.env.ICT_CONFIDENCE_THRESHOLD || '75', 10),
  ICT_MAX_POSITION_SIZE_PERCENT: parseFloat(process.env.ICT_MAX_POSITION_SIZE_PERCENT || '2'),
  ICT_DEFAULT_LEVERAGE: parseInt(process.env.ICT_DEFAULT_LEVERAGE || '10', 10),
  ICT_STOP_LOSS_PERCENT: parseFloat(process.env.ICT_STOP_LOSS_PERCENT || '1.5'),
  ICT_TAKE_PROFIT_RATIO: parseFloat(process.env.ICT_TAKE_PROFIT_RATIO || '2'),
  SNIPER_PUMP_THRESHOLD: parseFloat(process.env.SNIPER_PUMP_THRESHOLD || '5'),
  SNIPER_DUMP_THRESHOLD: parseFloat(process.env.SNIPER_DUMP_THRESHOLD || '-10'),
  SNIPER_LIQUIDATION_THRESHOLD: parseFloat(process.env.SNIPER_LIQUIDATION_THRESHOLD || '75'),
  MAX_DAILY_LOSS_PERCENT: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5'),
  MAX_OPEN_POSITIONS: parseInt(process.env.MAX_OPEN_POSITIONS || '3', 10),
  PAPER_TRADING_MODE: process.env.PAPER_TRADING_MODE === 'true',

  // Cache TTL
  CACHE_PRICE_DATA_TTL: parseInt(process.env.CACHE_PRICE_DATA_TTL || '10', 10),
  CACHE_LIQUIDATION_DATA_TTL: parseInt(process.env.CACHE_LIQUIDATION_DATA_TTL || '30', 10),
  CACHE_FUNDING_RATES_TTL: parseInt(process.env.CACHE_FUNDING_RATES_TTL || '300', 10),

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validate critical environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0 && config.NODE_ENV !== 'test') {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

export default config;
