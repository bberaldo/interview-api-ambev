import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Findings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.finding.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.finding.deleteMany();
    await prisma.finding.createMany({
      data: [
        {
          externalId: 'ISS-TEST-001', type: 'SAST', repository: 'billing-api',
          branch: 'main', commit: 'abc123', language: 'TypeScript',
          category: 'SQL Injection', title: 'SQL Injection', description: 'x',
          ruleId: 'sql_injection', file: 'src/x.ts', line: 10, score: 850,
          status: 'OPEN', author: 'user1', classification: 'P1',
          detectedAt: new Date('2026-01-01'), updatedAtSource: new Date('2026-01-02'),
        },
        {
          externalId: 'ISS-TEST-002', type: 'SCA', repository: 'orders-api',
          branch: 'develop', commit: 'def456', language: 'Java',
          category: 'Transitive Dependency Risk', title: 'Risk', description: 'x',
          ruleId: 'transitive_dependency_risk', file: 'pom.xml', line: 1, score: 500,
          status: 'FIXED', author: 'user2', classification: 'P2',
          detectedAt: new Date('2026-01-03'), updatedAtSource: new Date('2026-01-04'),
        },
      ],
    });
  });

  it('GET /issues retorna paginado', async () => {
    const res = await request(app.getHttpServer()).get('/issues').expect(200);
    expect(res.body.total).toBe(2);
  });

  it('GET /issues filtra por type e status', async () => {
    const res = await request(app.getHttpServer()).get('/issues?type=SAST&status=OPEN').expect(200);
    expect(res.body.data[0].externalId).toBe('ISS-TEST-001');
  });

  it('GET /issues/:id retorna 404 pra id inexistente', async () => {
    await request(app.getHttpServer()).get('/issues/NAO-EXISTE').expect(404);
  });

  it('GET /metrics agrega corretamente', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.classification.P1).toBe(1);
  });
});
