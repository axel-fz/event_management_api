import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function setupApp(app: INestApplication): void {
  // 1. Helmet security headers (with CSP configured for Swagger CDN assets)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            'https://cdnjs.cloudflare.com',
          ],
          scriptSrc: [
            `'self'`,
            `'unsafe-inline'`,
            'https://cdnjs.cloudflare.com',
          ],
          imgSrc: [`'self'`, 'data:', 'https://validator.swagger.io'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin:
      corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 3. Global Prefix /v1
  app.setGlobalPrefix('v1', {
    exclude: ['docs', 'docs-json'],
  });

  // 4. Global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 6. Global ClassSerializerInterceptor
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // 7. Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Event Management REST API')
    .setDescription(
      'A production-ready Event Management REST API backend built with NestJS, PostgreSQL (Supabase), TypeORM, and Swagger.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Bearer token',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const SWAGGER_CDN =
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0';

  SwaggerModule.setup('docs', app, document, {
    customCssUrl: [
      `${SWAGGER_CDN}/swagger-ui.min.css`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.min.css`,
    ],
    customJs: [
      `${SWAGGER_CDN}/swagger-ui-bundle.min.js`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.min.js`,
    ],
    customSiteTitle: 'Event Management API Docs',
  });

  // Explicit JSON endpoint for Swagger at /docs-json
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/docs-json', (_req, res) => {
    res.json(document);
  });
}
