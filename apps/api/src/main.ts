import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const webOrigin = config.get<string>('app.webOrigin') ?? 'http://localhost:3000';
  const mobileOrigin = config.get<string>('app.mobileOrigin') ?? '*';
  const allowedOrigins = mobileOrigin === '*' ? '*' : [webOrigin, mobileOrigin];
  app.enableCors({
    origin: allowedOrigins === '*' ? true : allowedOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = config.get<number>('app.port') ?? 4000;
  await app.listen(port);
  Logger.log(`Tedor API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();