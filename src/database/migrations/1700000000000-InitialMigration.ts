import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    // Create events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(150) NOT NULL,
        "description" text NOT NULL,
        "location" character varying(255) NOT NULL,
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "capacity" integer NOT NULL,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_ownerId" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // Create indexes for events
    await queryRunner.query(`
      CREATE INDEX "IDX_events_startDate" ON "events" ("startDate");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_events_ownerId" ON "events" ("ownerId");
    `);

    // Create registrations table
    await queryRunner.query(`
      CREATE TABLE "registrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_registrations_user_event" UNIQUE ("userId", "eventId"),
        CONSTRAINT "PK_registrations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_registrations_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_registrations_eventId" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "registrations" DROP CONSTRAINT "FK_registrations_eventId";
    `);
    await queryRunner.query(`
      ALTER TABLE "registrations" DROP CONSTRAINT "FK_registrations_userId";
    `);
    await queryRunner.query(`
      DROP TABLE "registrations";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_events_ownerId";
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_events_startDate";
    `);
    await queryRunner.query(`
      ALTER TABLE "events" DROP CONSTRAINT "FK_events_ownerId";
    `);
    await queryRunner.query(`
      DROP TABLE "events";
    `);
    await queryRunner.query(`
      DROP TABLE "users";
    `);
  }
}
