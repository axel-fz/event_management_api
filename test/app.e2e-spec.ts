import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

describe('Event Management API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | null = null;
  let dbAvailable = false;

  const testUserA = {
    email: `owner_${Date.now()}@example.com`,
    name: 'Event Owner',
    password: 'Password123!',
  };

  const testUserB = {
    email: `attendee_${Date.now()}@example.com`,
    name: 'Attendee User',
    password: 'Password123!',
  };

  let tokenA = '';
  let tokenB = '';
  let createdEventId = '';

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      setupApp(app);
      await app.init();

      dataSource = app.get(DataSource);
      if (dataSource && dataSource.isInitialized) {
        // Run migrations or synchronize schema for test database
        await dataSource.synchronize(true);
        dbAvailable = true;
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn(
        `\n⚠️ E2E Test DB Notice: Could not connect to PostgreSQL (${error.message}).\n` +
          'Live database tests will be skipped. Configure TEST_DATABASE_URL to run full E2E suite against a PostgreSQL instance.\n',
      );
      dbAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Health check', () => {
    it('/v1/health (GET) returns 200 ok', async () => {
      if (!app) {
        return;
      }
      const response = await request(app.getHttpServer())
        .get('/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Full User Journey (register -> login -> create -> list -> update -> register -> cancel -> delete)', () => {
    it('1. POST /v1/auth/register - Register User A (Owner)', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(testUserA)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty(
        'email',
        testUserA.email.toLowerCase(),
      );
      tokenA = res.body.accessToken;
    });

    it('2. POST /v1/auth/register - Register User B (Attendee)', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(testUserB)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      tokenB = res.body.accessToken;
    });

    it('3. POST /v1/auth/login - Log in with User A', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testUserA.email,
          password: testUserA.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      tokenA = res.body.accessToken;
    });

    it('4. GET /v1/auth/me - Retrieve profile for authenticated user', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', testUserA.email.toLowerCase());
      expect(res.body).toHaveProperty('name', testUserA.name);
    });

    it('5. POST /v1/events - Create an event with capacity 1 (User A)', async () => {
      if (!dbAvailable) return;

      const startDate = new Date(Date.now() + 86400000 * 5); // 5 days in future
      const endDate = new Date(Date.now() + 86400000 * 6); // 6 days in future

      const res = await request(app.getHttpServer())
        .post('/v1/events')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Exclusive VIP Masterclass',
          description: 'Intensive workshop with strictly 1 seat available.',
          location: 'San Francisco, CA',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          capacity: 1,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('capacity', 1);
      expect(res.body).toHaveProperty('registeredCount', 0);
      expect(res.body).toHaveProperty('availableSpots', 1);
      createdEventId = res.body.id;
    });

    it('6. GET /v1/events - List available events', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/v1/events?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('7. GET /v1/events/:id - Get event details', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .get(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', createdEventId);
      expect(res.body).toHaveProperty('owner');
      expect(res.body.isRegistered).toBe(false);
    });

    it('8. PATCH /v1/events/:id - Non-owner attempt to update should return 403 Forbidden', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .patch(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Unauthorized Modification' })
        .expect(403);
    });

    it('9. PATCH /v1/events/:id - Owner successfully updates event title', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .patch(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Exclusive VIP Masterclass (Updated)' })
        .expect(200);

      expect(res.body).toHaveProperty(
        'title',
        'Exclusive VIP Masterclass (Updated)',
      );
    });

    it('10. POST /v1/events/:id/registrations - User B registers for event', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .post(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('eventId', createdEventId);
    });

    it('11. POST /v1/events/:id/registrations - Duplicate registration attempt returns 409 Conflict', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .post(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(409);
    });

    it('12. POST /v1/events/:id/registrations - Registering when capacity is full returns 409 Conflict', async () => {
      if (!dbAvailable) return;

      // Event had capacity: 1, User B registered, so now capacity is full
      await request(app.getHttpServer())
        .post(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(409);
    });

    it('13. GET /v1/users/me/registrations - User B views their registered events', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/v1/users/me/registrations')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('eventId', createdEventId);
    });

    it('14. GET /v1/events/:id/registrations - Owner views attendees', async () => {
      if (!dbAvailable) return;

      const res = await request(app.getHttpServer())
        .get(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toHaveProperty(
        'email',
        testUserB.email.toLowerCase(),
      );
    });

    it('15. DELETE /v1/events/:id/registrations - User B cancels registration (204)', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .delete(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(204);
    });

    it('16. DELETE /v1/events/:id/registrations - Cancelling again returns 404', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .delete(`/v1/events/${createdEventId}/registrations`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('17. DELETE /v1/events/:id - Non-owner attempt to delete returns 403', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .delete(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('18. DELETE /v1/events/:id - Owner deletes event (204)', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .delete(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(204);
    });

    it('19. GET /v1/events/:id - Deleted event returns 404', async () => {
      if (!dbAvailable) return;

      await request(app.getHttpServer())
        .get(`/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });
});
