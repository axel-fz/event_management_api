import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

let cachedApp: express.Express | null = null;

async function bootstrapServer(): Promise<express.Express> {
  if (!cachedApp) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] },
    );
    setupApp(app);
    await app.init();
    cachedApp = expressApp;
  }
  return cachedApp;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const server = await bootstrapServer();
    return server(req, res);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(
      'Serverless function invocation error:',
      error.message,
      error.stack,
    );
    res.status(500).json({
      statusCode: 500,
      message: 'Serverless function failed to initialize',
      error: error.message,
    });
  }
}
