import { parseDurationToSeconds } from '../common/utils/duration.util';

export interface DatabaseConfig {
  url: string;
  migrationUrl?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: number;
}

export interface CorsConfig {
  origin: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cors: CorsConfig;
  throttle: ThrottleConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url:
      process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
        ? process.env.TEST_DATABASE_URL
        : process.env.DATABASE_URL || '',
    migrationUrl:
      process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
  },
  jwt: {
    secret: (
      process.env.JWT_SECRET ||
      'super_secret_jwt_key_at_least_32_characters_long_for_dev_environment'
    )
      .replace(/^['"]|['"]$/g, '')
      .trim(),
    expiresIn: parseDurationToSeconds(process.env.JWT_EXPIRES_IN),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
  },
});
