import { UnprocessableEntityException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalApiClient } from './external-api.client';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: { finding: { upsert: jest.Mock }; $transaction: jest.Mock };
  let externalApi: { getPage: jest.Mock };

  beforeEach(() => {
    prisma = {
      finding: { upsert: jest.fn((args) => args) },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    externalApi = { getPage: jest.fn() };

    service = new SyncService(
      prisma as unknown as PrismaService,
      externalApi as unknown as ExternalApiClient,
    );
  });

  const mockFinding = (overrides = {}) => ({
    id: 'ISS-000001',
    type: 'SAST',
    repository: 'billing-api',
    branch: 'main',
    commit: 'abc123',
    language: 'TypeScript',
    category: 'SQL Injection',
    title: 'SQL Injection',
    description: 'Detected SQL Injection',
    ruleId: 'sql_injection',
    file: 'src/x.ts',
    line: 10,
    score: 850,
    status: 'OPEN',
    author: 'user1',
    detectedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  });

  it('percorre todas as páginas até hasNext ser false', async () => {
    externalApi.getPage
      .mockResolvedValueOnce({
        page: 1, limit: 100, total: 2, totalPages: 2, hasNext: true, hasPrevious: false,
        data: [mockFinding({ id: 'ISS-000001' })],
      })
      .mockResolvedValueOnce({
        page: 2, limit: 100, total: 2, totalPages: 2, hasNext: false, hasPrevious: true,
        data: [mockFinding({ id: 'ISS-000002' })],
      });

    const result = await service.syncAll();

    expect(externalApi.getPage).toHaveBeenCalledTimes(2);
    expect(externalApi.getPage).toHaveBeenNthCalledWith(1, 1, 100);
    expect(externalApi.getPage).toHaveBeenNthCalledWith(2, 2, 100);
    expect(result.totalSynced).toBe(2);
  });

  it('para na primeira página se hasNext já vier false', async () => {
    externalApi.getPage.mockResolvedValueOnce({
      page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrevious: false,
      data: [mockFinding()],
    });

    await service.syncAll();

    expect(externalApi.getPage).toHaveBeenCalledTimes(1);
  });

  it('chama upsert com externalId correto e classificação calculada', async () => {
    externalApi.getPage.mockResolvedValueOnce({
      page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrevious: false,
      data: [mockFinding({ score: 850, category: 'SQL Injection', type: 'SAST' })],
    });

    await service.syncAll();

    const upsertCalls = prisma.$transaction.mock.calls[0][0];
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].create.classification).toBe('P1');
  });

  it('propaga erro se a API externa falhar', async () => {
    externalApi.getPage.mockRejectedValueOnce(new Error('timeout'));

    await expect(service.syncAll()).rejects.toThrow('timeout');
  });

  it('lança UnprocessableEntityException para type desconhecido', async () => {
    externalApi.getPage.mockResolvedValueOnce({
      page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrevious: false,
      data: [mockFinding({ type: 'INVALID_TYPE' })],
    });

    await expect(service.syncAll()).rejects.toThrow(UnprocessableEntityException);
  });

  it('lança UnprocessableEntityException para status desconhecido', async () => {
    externalApi.getPage.mockResolvedValueOnce({
      page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrevious: false,
      data: [mockFinding({ status: 'INVALID_STATUS' })],
    });

    await expect(service.syncAll()).rejects.toThrow(UnprocessableEntityException);
  });
});