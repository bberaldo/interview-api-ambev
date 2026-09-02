import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ExternalApiClient } from './external-api.client';
import { SyncController } from './sync.controller';

@Module({
  imports: [HttpModule],
  controllers: [SyncController],
  providers: [SyncService, ExternalApiClient],
})
export class SyncModule {}
