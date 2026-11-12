import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';

dotenv.config();

const rawDbUrl =
  process.env.MIGRATION_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!rawDbUrl) {
  throw new Error(
    'DATABASE_URL or MIGRATION_DATABASE_URL environment variable is required for TypeORM data source',
  );
}

const isLocalOrDisabled =
  rawDbUrl.includes('sslmode=disable') ||
  rawDbUrl.includes('localhost') ||
  rawDbUrl.includes('127.0.0.1');

// Remove sslmode query parameter so it doesn't override our explicit ssl options
const dbUrl = rawDbUrl
  .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
  .replace(/([?&])pgbouncer=[^&]+(&|$)/, '$1')
  .replace(/[?&]$/, '');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl,
  entities: [User, Event, Registration],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: isLocalOrDisabled ? false : { rejectUnauthorized: false },
  extra: {
    ssl: isLocalOrDisabled ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
