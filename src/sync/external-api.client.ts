import { Injectable, Logger } from '@nestjs/common';
import { ExternalFindingsPage } from './dto/external-finding.dto';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ExternalApiClient {
  private readonly logger = new Logger(ExternalApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('EXTERNAL_API_URL');
    this.token = this.config.getOrThrow<string>('EXTERNAL_API_TOKEN');
  }

  async getPage(page: number, limit = 100): Promise<ExternalFindingsPage> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.get<ExternalFindingsPage>('/api/v1/findings', {
            baseURL: this.baseUrl,
            params: { page, limit },
            headers: { Authorization: `Bearer ${this.token}` },
            timeout: 10_000,
          }),
        );
        return response.data;
      } catch (err) {
        this.logger.warn(
          `Falha ao buscar página ${page} (tentativa ${attempt}/${maxRetries})`,
        );
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempt)); // backoff simples
      }
    }

    throw new Error('unreachable');
  }
}
