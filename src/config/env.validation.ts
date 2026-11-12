import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  TEST_DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  MIGRATION_DATABASE_URL?: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET must be at least 32 characters long for security',
  })
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN = '1d';

  @IsString()
  CORS_ORIGIN = '*';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL = 60000; // 60 seconds in ms

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT = 60;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => {
        const constraints = err.constraints
          ? Object.values(err.constraints).join(', ')
          : 'invalid';
        return `  - ${err.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `\n❌ Environment validation failed:\n${formattedErrors}\nPlease check your .env configuration.\n`,
    );
  }

  return validatedConfig;
}
