import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListFindingsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit = 20;

  @ApiPropertyOptional({ example: 'mobile-backend' })
  @IsOptional()
  repository?: string;

  @ApiPropertyOptional({ enum: ['SAST', 'SCA'] })
  @IsOptional()
  @IsIn(['SAST', 'SCA'])
  type?: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'FIXED', 'IGNORED'] })
  @IsOptional()
  @IsIn(['OPEN', 'FIXED', 'IGNORED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['P1', 'P2', 'P3', 'P4', 'P5'] })
  @IsOptional()
  @IsIn(['P1', 'P2', 'P3', 'P4', 'P5'])
  classification?: string;
}
