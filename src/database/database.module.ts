import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawDbUrl =
          configService.get<string>('database.url') ||
          process.env.DATABASE_URL ||
          '';

        const isLocalOrDisabled =
          rawDbUrl.includes('sslmode=disable') ||
          rawDbUrl.includes('localhost') ||
          rawDbUrl.includes('127.0.0.1');

        const dbUrl = rawDbUrl
          .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
          .replace(/([?&])pgbouncer=[^&]+(&|$)/, '$1')
          .replace(/[?&]$/, '');

        const isServerless =
          !!process.env.VERCEL ||
          process.env.NODE_ENV === 'test' ||
          process.env.NODE_ENV === 'production';

        return {
          type: 'postgres',
          url: dbUrl,
          entities: [User, Event, Registration],
          synchronize: false,
          ssl: isLocalOrDisabled ? false : { rejectUnauthorized: false },
          retryAttempts: isServerless ? 1 : 10,
          retryDelay: isServerless ? 500 : 3000,
          extra: {
            ssl: isLocalOrDisabled ? false : { rejectUnauthorized: false },
            max: 3,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
