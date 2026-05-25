import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CoreModule } from './common/core/core.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { FeatureModule } from './features/feature.module';

@Module({
  imports: [CoreModule, FeatureModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
