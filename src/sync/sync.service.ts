import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExternalApiClient } from './external-api.client';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalFinding } from './dto/external-finding.dto';
import { classify } from '../classification/classification.service';
import { FindingStatus, FindingType } from '@prisma/client';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly externalApi: ExternalApiClient,
  ) {}

  async syncAll() {
    const started = Date.now();
    let page = 1;
    let hasNext = true;
    let totalSynced = 0;

    while (hasNext) {
      const result = await this.externalApi.getPage(page, 100);

      await this.upsertBatch(result.data);

      totalSynced += result.data.length;
      hasNext = result.hasNext;
      page++;

      this.logger.log(
        `Página ${result.page}/${result.totalPages} sincronizada (${totalSynced} findings)`,
      );
    }

    const durationMs = Date.now() - started;
    this.logger.log(
      `Sync concluído: ${totalSynced} findings em ${durationMs}ms`,
    );

    return { totalSynced, durationMs };
  }

  // Organizar os dados e fazer upsert no banco
  private async upsertBatch(findings: ExternalFinding[]) {
    // upsert para caso já exista, apenas atualize, sem criar novos registros
    await this.prisma.$transaction(
      findings.map((f) =>
        this.prisma.finding.upsert({
          where: { externalId: f.id },
          create: {
            externalId: f.id,
            type: this.toFindingType(f.type),
            repository: f.repository,
            branch: f.branch,
            commit: f.commit,
            language: f.language,
            category: f.category,
            title: f.title,
            description: f.description,
            ruleId: f.ruleId,
            file: f.file,
            line: f.line,
            score: f.score,
            status: this.toFindingStatus(f.status),
            author: f.author,
            classification: classify(f.type, f.score, f.category), // regra de classificação
            detectedAt: new Date(f.detectedAt),
            updatedAtSource: new Date(f.updatedAt),
          },
          update: {
            score: f.score,
            status: this.toFindingStatus(f.status),
            classification: classify(f.type, f.score, f.category),
            updatedAtSource: new Date(f.updatedAt),
          },
        }),
      ),
    );
  }

  private toFindingType(value: string): FindingType {
    if (!['SAST', 'SCA'].includes(value)) {
      throw new UnprocessableEntityException(
        `Tipo de finding desconhecido: ${value}`,
      );
    }
    return value as FindingType;
  }

  private toFindingStatus(value: string): FindingStatus {
    if (!['OPEN', 'FIXED', 'IGNORED'].includes(value)) {
      throw new UnprocessableEntityException(
        `Status de finding desconhecido: ${value}`,
      );
    }
    return value as FindingStatus;
  }
}
