import { NotFoundException } from '@nestjs/common';
import { FindingsService } from './findings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FindingsService', () => {
  let service: FindingsService;
  let prisma: {
    finding: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      finding: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new FindingsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('monta o where corretamente a partir dos filtros informados', async () => {
      prisma.$transaction.mockResolvedValue([2, [{ id: '1' }, { id: '2' }]]);

      await service.findAll({
        page: 1,
        limit: 20,
        repository: 'billing-api',
        type: 'SAST',
        status: 'OPEN',
        classification: 'P1',
      });

      const [countCall] = prisma.$transaction.mock.calls[0][0];
      // Se count/findMany forem chamados como builders de Promise (não é o caso aqui,
      // já que usamos array de operações), o ideal é inspecionar os argumentos passados
      // diretamente às chamadas de finding.count e finding.findMany:
      expect(prisma.finding.count).toHaveBeenCalledWith({
        where: {
          repository: 'billing-api',
          type: 'SAST',
          status: 'OPEN',
          classification: 'P1',
        },
      });
    });

    it('ignora filtros não informados (where vazio)', async () => {
      prisma.$transaction.mockResolvedValue([0, []]);

      await service.findAll({ page: 1, limit: 20 });

      // garante que não filtrou por campos undefined
      expect(prisma.finding.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ repository: undefined }) }),
      );
    });

    it('calcula corretamente hasNext e hasPrevious', async () => {
      prisma.$transaction.mockResolvedValue([50, new Array(20).fill({})]);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });

    it('hasPrevious é false na primeira página', async () => {
      prisma.$transaction.mockResolvedValue([50, new Array(20).fill({})]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.hasPrevious).toBe(false);
    });
  });

  describe('findOne', () => {
    it('retorna o finding quando encontrado', async () => {
      const finding = { externalId: 'ISS-000001', category: 'SQL Injection' };
      prisma.finding.findUnique.mockResolvedValue(finding);

      const result = await service.findOne('ISS-000001');

      expect(prisma.finding.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'ISS-000001' },
      });
      expect(result).toEqual(finding);
    });

    it('lança NotFoundException quando não encontrado', async () => {
      prisma.finding.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ISS-999999')).rejects.toThrow(NotFoundException);
    });
  });
});