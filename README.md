# Event Management REST API

A production-ready, serverless-friendly Event Management REST API built with NestJS, PostgreSQL (Supabase), TypeORM, and Swagger. Designed for high concurrency, strict type safety, race-condition prevention, and deployment to Vercel Serverless Functions.

---

## 1. Project Overview & Features

This backend service provides an end-to-end event management platform where users can register accounts, create and manage events, browse upcoming events with filters and pagination, and register for events with guaranteed concurrency safety.

### Core Features
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing (cost factor 10), email normalization, and timing-attack resistant login.
- **Role & Ownership Isolation**: Per-event ownership controls ensuring only creators can update, delete, or inspect attendee lists.
- **Concurrency & Race-Condition Safe Registrations**: Pessimistic write locking (`SELECT ... FOR UPDATE`) in PostgreSQL transactions ensuring that overbooking an event under high concurrent traffic is mathematically impossible.
- **Event Lifecycle Rules**: Start dates strictly validated in the future on creation, capacity reduction blocked if it falls below current attendance, and automatic rejection of registrations for ended events.
- **Public & Protected Endpoints**: Global JWT guard with selective `@Public()` opt-outs for registration, login, and health checks.
- **Rate Limiting (Throttling)**: Global rate limiting with stricter thresholds on sensitive authentication routes (`/v1/auth/login`, `/v1/auth/register`).
- **Swagger Documentation**: Interactive OpenAPI documentation served at `/docs` (and OpenAPI JSON spec at `/docs-json`), configured with CDN-hosted assets to function reliably on Vercel serverless functions.
- **Vercel Serverless Ready**: Application instance caching pattern across serverless invocations for minimal cold starts.

---

## 2. Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v10 (TypeScript in strict mode)
- **Database**: PostgreSQL on [Supabase](https://supabase.com/) (using connection pooler)
- **ORM**: [TypeORM](https://typeorm.io/) v0.3 (manual migrations, `synchronize: false`)
- **Hosting**: [Vercel](https://vercel.com/) Serverless Functions (`@vercel/node`)
- **Security & Validation**: `helmet`, `@nestjs/throttler`, `class-validator`, `class-transformer`, `bcrypt`, `@nestjs/passport`, `passport-jwt`
- **Documentation**: `@nestjs/swagger`, `swagger-ui-express`
- **Testing**: Jest, Supertest

---

## 3. Prerequisites

- **Node.js**: Node 18+ LTS (tested on Node v18 / v20)
- **Package Manager**: npm (v9+)
- **Database Account**: Free-tier [Supabase](https://supabase.com/) account
- **Deployment Platform**: Free [Vercel](https://vercel.com/) account and [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

---

## 4. Run Locally

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd event-management-api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in your Supabase connection strings and a strong `JWT_SECRET` (at least 32 characters).

### 3. Run Migrations
```bash
npm run migration:run
```

### 4. Start Local Development Server
```bash
npm run start:dev
```
- API Base URL: `http://localhost:3000/v1`
- Swagger UI: `http://localhost:3000/docs`
- Swagger JSON Spec: `http://localhost:3000/docs-json`
- Health Check: `http://localhost:3000/v1/health`

---

## 5. Environment Variables Table

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Optional | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | Optional | HTTP port for local development (defaults to 3000) | `3000` |
| `DATABASE_URL` | **Yes** | Supabase Transaction Pooler URL (port 6543) | `postgresql://postgres.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` |
| `MIGRATION_DATABASE_URL`| Optional | Supabase Session Pooler URL (port 5432) for running migrations | `postgresql://postgres.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require` |
| `TEST_DATABASE_URL` | Optional | Dedicated PostgreSQL database connection URL for E2E tests | `postgresql://postgres:postgres@localhost:5432/event_api_test` |
| `JWT_SECRET` | **Yes** | Secret string used for signing and verifying JWTs (minimum 32 characters) | `a8f9c2d1e0b3456789abcdef0123456789abcdef` |
| `JWT_EXPIRES_IN` | Optional | Expiry duration for issued access tokens | `1d` |
| `CORS_ORIGIN` | Optional | Allowed CORS origins (wildcard `*` or comma-separated origins) | `*` or `https://myapp.com` |
| `THROTTLE_TTL` | Optional | Rate limit window in milliseconds | `60000` |
| `THROTTLE_LIMIT` | Optional | Maximum requests allowed per window | `60` |

### Supabase Connection Pooler Guide & IPv6 Note
> **Why use the connection pooler on port 6543?**
> Supabase free tier databases resolve exclusively over IPv6 for direct connections. Many cloud providers and local ISPs (as well as Vercel serverless environments) only support IPv4 egress by default. Connecting directly to port 5432 on a direct hostname can result in `ENETUNREACH` or `ETIMEDOUT` errors.
> 
> **How to get the pooler URL**:
> 1. Open your Supabase Dashboard -> **Project Settings** -> **Database**.
> 2. Scroll to **Connection string** and select the **URI** tab.
> 3. Choose **Transaction mode** (port `6543`). This pooler uses PgBouncer with IPv4 support and allows hundreds of serverless function instances to connect without exhausting database connections.
> 4. For running migrations from your local CLI, use **Session mode** (port `5432`) under `MIGRATION_DATABASE_URL`, as DDL statements and migration locks require a session-level connection.

---

## 6. Database Setup and Migrations

TypeORM is configured with `synchronize: false` across **all** environments to protect production data integrity. Database schema alterations must be applied via versioned migrations.

### Migration Commands

- **Run pending migrations**:
  ```bash
  npm run migration:run
  ```
- **Revert last migration**:
  ```bash
  npm run migration:revert
  ```
- **Show migration status**:
  ```bash
  npm run migration:show
  ```
- **Generate new migration from entity changes**:
  ```bash
  npm run migration:generate -- src/database/migrations/DescriptiveName
  ```

### Initial Migration
The initial migration (`src/database/migrations/1700000000000-InitialMigration.ts`) automatically:
1. Enables the `uuid-ossp` extension for native UUID generation.
2. Creates the `users`, `events`, and `registrations` tables with timestamps (`timestamptz`).
3. Creates foreign key constraints with `ON DELETE CASCADE`.
4. Creates performance indexes on `events(startDate)` and `events(ownerId)`.
5. Enforces a compound unique constraint on `registrations(userId, eventId)`.

---

## 7. API Usage Guide (cURL Examples)

All API routes (except Swagger docs) are prefixed with `/v1`.

### 1. Register Account
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "name": "Jane Organizer",
    "password": "SecurePassword123"
  }'
```
*Response (201 Created):*
```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "e9317b3c-6229-411a-8cfa-5b1234567890",
    "email": "organizer@example.com",
    "name": "Jane Organizer",
    "createdAt": "2026-11-12T12:00:00.000Z",
    "updatedAt": "2026-11-12T12:00:00.000Z"
  }
}
```

### 2. Log In
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "SecurePassword123"
  }'
```
*Response (200 OK):*
```json
{
  "accessToken": "eyJhbGciOi..."
}
```

### 3. Get Current User (`/auth/me`)
```bash
curl -X GET http://localhost:3000/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Create an Event
```bash
curl -X POST http://localhost:3000/v1/events \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Global Tech Summit 2027",
    "description": "Annual developer gathering discussing cloud architecture.",
    "location": "Moscone Center, San Francisco, CA",
    "startDate": "2027-05-15T09:00:00.000Z",
    "endDate": "2027-05-17T18:00:00.000Z",
    "capacity": 100
  }'
```

### 5. List Events with Search & Filters
```bash
# Query with search, date filters, and pagination
curl -X GET "http://localhost:3000/v1/events?search=Tech&upcoming=true&page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```
*Response (200 OK):*
```json
{
  "data": [
    {
      "id": "c76f3f01-52e6-43b6-9bb8-0e9f1a2b3c4d",
      "title": "Global Tech Summit 2027",
      "description": "Annual developer gathering discussing cloud architecture.",
      "location": "Moscone Center, San Francisco, CA",
      "startDate": "2027-05-15T09:00:00.000Z",
      "endDate": "2027-05-17T18:00:00.000Z",
      "capacity": 100,
      "ownerId": "e9317b3c-6229-411a-8cfa-5b1234567890",
      "registeredCount": 0,
      "availableSpots": 100,
      "isRegistered": false,
      "createdAt": "2026-11-12T12:00:00.000Z",
      "updatedAt": "2026-11-12T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 6. Get Event Details
```bash
curl -X GET http://localhost:3000/v1/events/<EVENT_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

### 7. View Events Created by Me
```bash
curl -X GET http://localhost:3000/v1/events/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 8. Update an Event (Owner Only)
```bash
curl -X PATCH http://localhost:3000/v1/events/<EVENT_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Global Tech Summit 2027 (Updated Venue)",
    "capacity": 150
  }'
```

### 9. Register for an Event
```bash
curl -X POST http://localhost:3000/v1/events/<EVENT_ID>/registrations \
  -H "Authorization: Bearer <TOKEN>"
```
*Response (201 Created):*
```json
{
  "id": "fa21b920-94d1-447a-bdc3-88bbccddeeff",
  "userId": "e9317b3c-6229-411a-8cfa-5b1234567890",
  "eventId": "c76f3f01-52e6-43b6-9bb8-0e9f1a2b3c4d",
  "createdAt": "2026-11-12T12:05:00.000Z"
}
```

### 10. List Events I Registered For
```bash
curl -X GET http://localhost:3000/v1/users/me/registrations \
  -H "Authorization: Bearer <TOKEN>"
```

### 11. View Event Attendees (Owner Only)
```bash
curl -X GET http://localhost:3000/v1/events/<EVENT_ID>/registrations \
  -H "Authorization: Bearer <TOKEN>"
```

### 12. Cancel My Registration
```bash
curl -X DELETE http://localhost:3000/v1/events/<EVENT_ID>/registrations \
  -H "Authorization: Bearer <TOKEN>"
# Returns 204 No Content
```

### 13. Delete Event (Owner Only)
```bash
curl -X DELETE http://localhost:3000/v1/events/<EVENT_ID> \
  -H "Authorization: Bearer <TOKEN>"
# Returns 204 No Content
```

### 14. Health Check (Public)
```bash
curl -X GET http://localhost:3000/v1/health
```
*Response (200 OK):*
```json
{
  "status": "ok",
  "timestamp": "2026-11-12T12:00:00.000Z"
}
```

---

## 8. Business Rules and Design Decisions

1. **Global Security by Default**:
   All endpoints require a valid JWT Bearer token unless explicitly marked with `@Public()`.
2. **Owner May Register for Own Event**:
   Event owners are permitted to register for their own event. In community-driven meetups and peer workshops, the host or speaker is frequently also a participant occupying a seat/ticket.
3. **Pessimistic Locking for Zero Race Conditions**:
   Under high concurrent demand, standard `count()` and `insert()` logic exhibits race conditions where two requests simultaneously see 1 available spot and both insert. In this API, registration executes inside a transaction acquiring a `pessimistic_write` lock (`FOR UPDATE`) on the event row, ensuring serialized registration evaluations.
4. **Capacity Reduction Invariant**:
   An event owner cannot reduce capacity below the number of registered attendees (returns `409 Conflict`), preventing accidental cancellation or oversubscription of existing attendees.
5. **No User Enumeration on Login**:
   Invalid login attempts uniformly return `401 Unauthorized: Invalid email or password` with identical bcrypt timing execution to prevent email harvesting.
6. **Date Consistency Invariants**:
   Events cannot be created in the past (`startDate > now`), and `endDate` must strictly succeed `startDate`. When updating either date, the dates are evaluated against the effective values to maintain `endDate > startDate`.

---

## 9. Testing Instructions

### Unit Tests
The unit test suite covers authentication, event management (ownership, date cross-validation, capacity reduction invariants), and registrations (duplicate prevention, capacity limits, ended events, cancellation, and concurrency race-condition simulation).

```bash
npm test
```

### E2E Tests (Supertest)
The E2E suite exercises the entire user workflow from registration to cleanup.
To run against a dedicated test database:
```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/event_api_test npm run test:e2e
```
*(If no live test database is reachable, the E2E suite automatically executes all non-database checks like `/v1/health` and logs instructions for setting up `TEST_DATABASE_URL`).*

### Code Linting & Static Typing
```bash
npm run lint
npm run build
```

---

## 10. Deployment to Vercel Step-by-Step

Vercel hosts the API as a Serverless Function via `api/index.ts`.

### 1. Authenticate with Vercel CLI
```bash
npm install -g vercel
vercel login
```

### 2. Link Project
From the repository root:
```bash
vercel
```

### 3. Add Environment Variables to Vercel
Set each required environment variable on Vercel:
```bash
vercel env add NODE_ENV production
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN 1d
vercel env add CORS_ORIGIN *
```
*(Be sure to paste your Supabase Transaction Pooler URL on port 6543 for `DATABASE_URL`)*.

### 4. Deploy to Production
```bash
vercel --prod
```

### Deployed URLs Placeholders
- **Production API URL**: `https://<your-project>.vercel.app/v1`
- **Swagger Documentation URL**: `https://<your-project>.vercel.app/docs`
- **Health Check**: `https://<your-project>.vercel.app/v1/health`

---

## 11. Project Structure Explanation

```
api/
  index.ts                      # Vercel serverless entry point (caches NestJS instance)
src/
  main.ts                       # Local development bootstrap
  app.module.ts                 # Root module wiring config, db, guards, throttler
  app.setup.ts                  # Shared bootstrap: Helmet, CORS, ValidationPipe, Filters, Swagger CDN
  config/
    configuration.ts            # Typed environment configuration loader
    env.validation.ts           # Class-validator startup validation for env variables
  common/
    decorators/                 # @Public(), @CurrentUser()
    filters/                    # Global HttpExceptionFilter handling Nest & Postgres errors
    guards/                     # JwtAuthGuard (global authentication guard)
    dto/                        # PaginationQueryDto, PaginatedResponseDto
    interfaces/                 # JwtPayload, AuthenticatedUser
  database/
    database.module.ts          # TypeORM async module with pooler settings
    data-source.ts              # TypeORM CLI DataSource configuration
    migrations/                 # Committed migration files
  auth/
    auth.module.ts, controller, service
    strategies/jwt.strategy.ts
    dto/                        # RegisterDto, LoginDto, AuthResponseDto
  users/
    users.module.ts, service
    entities/user.entity.ts     # User entity with passwordHash select: false
    dto/                        # UserResponseDto
  events/
    events.module.ts, controller, service
    entities/event.entity.ts    # Event entity with indexes and cascades
    dto/                        # CreateEventDto, UpdateEventDto, QueryEventsDto, EventResponseDto
  registrations/
    registrations.module.ts, controller, service
    entities/registration.entity.ts # Registration entity with (userId, eventId) UNIQUE constraint
    dto/                        # RegistrationResponseDto
  health/
    health.controller.ts        # GET /v1/health public probe
test/
  app.e2e-spec.ts               # Supertest end-to-end integration test
vercel.json                     # Vercel serverless route rewrite configuration
.env.example                    # Documented template for environment variables
README.md                       # Comprehensive guide and documentation
```

---

## 12. Troubleshooting

### 1. Supabase SSL Errors (`SELF_SIGNED_CERT_IN_CHAIN` or `no pg_hba.conf entry`)
- **Cause**: Supabase requires SSL encryption.
- **Solution**: The database module is preconfigured with `ssl: { rejectUnauthorized: false }`. Ensure your connection string includes `?sslmode=require`.

### 2. Transaction Pooler Limitations (Port 6543)
- **Cause**: The Supabase transaction pooler (PgBouncer) does not allow prepared statements or session-level advisory locks.
- **Solution**: The application uses default unpreparedStatement execution and a maximum pool size of 3 per lambda instance. For database migrations, use the Session pooler URL on port 5432 (`MIGRATION_DATABASE_URL`).

### 3. Serverless Cold Starts
- **Cause**: Standard NestJS initialization takes time if instantiated on every HTTP request.
- **Solution**: `api/index.ts` caches the initialized `INestApplication` instance across warm lambda invocations. Subsequent requests reuse the running Express app instantly.

### 4. Swagger UI Static Assets Not Loading on Vercel
- **Cause**: Serverless functions do not serve static files from `node_modules/swagger-ui-dist` because npm packages are bundled.
- **Solution**: `src/app.setup.ts` configures `SwaggerModule.setup()` with `customCssUrl` and `customJs` pointing to a reliable public CDN (`cdnjs.cloudflare.com`), paired with Helmet CSP directives permitting CDN loading.
# event_management_api
