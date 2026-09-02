import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListFindingsQueryDto } from './dto/list-findings-query.dto';
import { FindingsService } from './findings.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('issues')
@Controller('issues')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista findings com paginação e filtros' })
  findAll(@Query() query: ListFindingsQueryDto) {
    return this.findingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca um finding pelo externalId (ex: ISS-000001)',
  })
  @ApiParam({ name: 'id', example: 'ISS-000001' })
  findOne(@Param('id') id: string) {
    return this.findingsService.findOne(id);
  }
}
