import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListFindingsQueryDto } from './dto/list-findings-query.dto';
import { Classification, FindingStatus, FindingType } from '@prisma/client';

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListFindingsQueryDto) {
    const { limit, page, classification, repository, status, type } = query;

    const where = {
      ...(repository && { repository }),
      ...(type && { type: type as FindingType }),
      ...(status && { status: status as FindingStatus }),
      ...(classification && {
        classification: classification as Classification,
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.finding.count({ where }),
      this.prisma.finding.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { detectedAt: 'desc' },
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
      data,
    };
  }

  async findOne(externalId: string) {
    const finding = await this.prisma.finding.findUnique({
      where: { externalId },
    });

    if (!finding) {
      throw new NotFoundException(
        `Finding com id "${externalId}" não encontrado`,
      );
    }

    return finding;
  }
}
