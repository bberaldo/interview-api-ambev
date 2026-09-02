import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncModule } from './sync/sync.module';
import { PrismaModule } from './prisma/prisma.module';
import { FindingsModule } from './findings/findings.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SyncModule,
    PrismaModule,
    FindingsModule,
    MetricsModule,
  ],
})
export class AppModule {}
