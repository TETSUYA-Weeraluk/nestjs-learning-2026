import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const httpLogger = new Logger('HTTP');

  app.enableCors({
    origin: configService.getOrThrow<string[]>('cors.origins'),
    credentials: configService.getOrThrow<boolean>('cors.credentials'),
  });
  app.enableShutdownHooks();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      httpLogger.log(
        `${method} ${originalUrl} ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  });

  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('Name API for new project')
    .setDescription('Description for new project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.getOrThrow<number>('port');
  await app.listen(port);
}
void bootstrap();
