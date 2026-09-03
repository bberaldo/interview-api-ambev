import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: {
    finding: { count: jest.Mock; groupBy: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      finding: { count: jest.fn(), groupBy: jest.fn() },
    };
    service = new MetricsService(prisma as unknown as PrismaService);
  });

  it('monta o objeto de métricas corretamente', async () => {
    prisma.finding.count.mockResolvedValue(10);
    prisma.finding.groupBy
      .mockResolvedValueOnce([
        { status: 'OPEN', _count: 5 },
        { status: 'FIXED', _count: 3 },
        { status: 'IGNORED', _count: 2 },
      ])
      .mockResolvedValueOnce([
        { classification: 'P1', _count: 4 },
        { classification: 'P2', _count: 6 },
      ]);

    const result = await service.metrics();

    expect(result).toEqual({
      total: 10,
      open: 5,
      fixed: 3,
      ignored: 2,
      classification: { P1: 4, P2: 6, P3: 0, P4: 0, P5: 0 },
    });
  });

  it('retorna 0 para status/classification ausentes no groupBy', async () => {
    prisma.finding.count.mockResolvedValue(0);
    prisma.finding.groupBy.mockResolvedValue([]);

    const result = await service.metrics();

    expect(result.open).toBe(0);
    expect(result.classification.P1).toBe(0);
  });
});
