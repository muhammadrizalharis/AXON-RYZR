import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });

  // Raised body limit so image-to-video base64 start frames (a few MB) are
  // accepted; default Express limit (100kb) would reject them with HTTP 413.
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ extended: true, limit: '20mb' }));

  const config = app.get(ConfigService);
  const appConfig = config.getOrThrow<AppConfig>('app');

  app.setGlobalPrefix(appConfig.globalPrefix);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: appConfig.corsOrigins.length ? appConfig.corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // OpenAPI docs (non-production).
  if (appConfig.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AXON-RYZR API')
      .setDescription('AURA Creative Studio — Generative AI backend')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.globalPrefix}/docs`, app, document);
  }

  await app.listen(appConfig.port, appConfig.host);

  const logger = new Logger('Bootstrap');
  logger.log(
    `AXON-RYZR API running on http://localhost:${appConfig.port}/${appConfig.globalPrefix}`,
  );
}

void bootstrap();
