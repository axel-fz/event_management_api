import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

const server = express();
let isInitialized = false;

async function bootstrap() {
  if (!isInitialized) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );
    setupApp(app);
    await app.init();
    isInitialized = true;
  }
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  await bootstrap();
  server(req, res);
}

