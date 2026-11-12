import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  setupApp(app);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/v1`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
