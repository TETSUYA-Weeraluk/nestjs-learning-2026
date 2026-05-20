import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpLogger = new Logger('HTTP');

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
    .setTitle('My Project API')
    .setDescription('รายละเอียด API สำหรับโปรเจกต์ของฉัน')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 5555);
}
void bootstrap();
