import { Injectable } from '@nestjs/common';
import { Classification, FindingStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const [total, statusGroups, classificationGroups] = await Promise.all([
      this.prisma.finding.count(),
      this.prisma.finding.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.finding.groupBy({
        by: ['classification'],
        _count: true,
      }),
    ]);

    // percorre o array statusGroups que tem 3 objetos, um para cada status OPEN, FIXED, IGNORED
    const statusCount = (status: FindingStatus) =>
      statusGroups.find((g) => g.status === status)?._count ?? 0;

    const classificationCount = (classification: Classification) =>
      classificationGroups.find((g) => g.classification === classification)
        ?._count ?? 0;

    return {
      total,
      open: statusCount('OPEN'),
      fixed: statusCount('FIXED'),
      ignored: statusCount('IGNORED'),
      classification: {
        P1: classificationCount('P1'),
        P2: classificationCount('P2'),
        P3: classificationCount('P3'),
        P4: classificationCount('P4'),
        P5: classificationCount('P5'),
      },
    };
  }
}
