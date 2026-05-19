import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('My Project API')
    .setDescription('รายละเอียด API สำหรับโปรเจกต์ของฉัน')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // เข้าใช้งานผ่าน http://localhost:3000/api

  await app.listen(process.env.PORT ?? 5555);
}
bootstrap();
