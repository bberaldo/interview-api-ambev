import { Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({ summary: 'Sincroniza todos os findings da API externa' })
  async sync() {
    return this.syncService.syncAll();
  }
}
