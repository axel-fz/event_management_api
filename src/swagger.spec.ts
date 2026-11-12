import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthController } from '../src/auth/auth.controller';
import { EventsController } from '../src/events/events.controller';
import { RegistrationsController } from '../src/registrations/registrations.controller';
import { HealthController } from '../src/health/health.controller';
import { AuthService } from '../src/auth/auth.service';
import { EventsService } from '../src/events/events.service';
import { RegistrationsService } from '../src/registrations/registrations.service';

describe('Swagger Documentation', () => {
  it('should generate swagger document with all routes and operations', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        EventsController,
        RegistrationsController,
        HealthController,
      ],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: EventsService, useValue: {} },
        { provide: RegistrationsService, useValue: {} },
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['docs', 'docs-json'] });

    const config = new DocumentBuilder()
      .setTitle('Event Management REST API')
      .setDescription('API Spec')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const paths = Object.keys(document.paths);
    expect(paths).toContain('/v1/auth/register');
    expect(paths).toContain('/v1/auth/login');
    expect(paths).toContain('/v1/auth/me');
    expect(paths).toContain('/v1/events');
    expect(paths).toContain('/v1/events/me');
    expect(paths).toContain('/v1/events/{id}');
    expect(paths).toContain('/v1/events/{id}/registrations');
    expect(paths).toContain('/v1/users/me/registrations');
    expect(paths).toContain('/v1/health');

    // Check tags and operations
    expect(document.paths['/v1/auth/register'].post).toBeDefined();
    expect(document.paths['/v1/auth/login'].post).toBeDefined();
    expect(document.paths['/v1/auth/me'].get).toBeDefined();
    expect(document.paths['/v1/events'].post).toBeDefined();
    expect(document.paths['/v1/events'].get).toBeDefined();
    expect(document.paths['/v1/events/me'].get).toBeDefined();
    expect(document.paths['/v1/events/{id}'].get).toBeDefined();
    expect(document.paths['/v1/events/{id}'].patch).toBeDefined();
    expect(document.paths['/v1/events/{id}'].delete).toBeDefined();
    expect(document.paths['/v1/events/{id}/registrations'].get).toBeDefined();
    expect(document.paths['/v1/events/{id}/registrations'].post).toBeDefined();
    expect(
      document.paths['/v1/events/{id}/registrations'].delete,
    ).toBeDefined();
    expect(document.paths['/v1/users/me/registrations'].get).toBeDefined();
    expect(document.paths['/v1/health'].get).toBeDefined();

    await app.close();
  });
});
