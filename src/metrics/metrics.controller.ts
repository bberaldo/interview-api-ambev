import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna métricas agregadas de findings' })
  getMetrics() {
    return this.metricsService.metrics();
  }
}
