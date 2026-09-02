import { ExternalApiClient } from './external-api.client';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ExternalApiClient', () => {
  let client: ExternalApiClient;
  let http: { get: jest.Mock };
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();

    http = { get: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'EXTERNAL_API_URL') return 'http://localhost:3000';
        if (key === 'EXTERNAL_API_TOKEN') return 'fake-token';
        return undefined;
      }),
    };

    client = new ExternalApiClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const mockResponse = (data: unknown): AxiosResponse =>
    ({ data, status: 200, statusText: 'OK', headers: {}, config: {} }) as AxiosResponse;

  it('retorna os dados da página quando a requisição funciona', async () => {
    const page = {
      page: 1, limit: 100, total: 1, totalPages: 1,
      hasNext: false, hasPrevious: false, data: [],
    };
    http.get.mockReturnValueOnce(of(mockResponse(page)));

    const result = await client.getPage(1, 100);

    expect(result).toEqual(page);
    expect(http.get).toHaveBeenCalledWith(
      '/api/v1/findings',
      expect.objectContaining({
        baseURL: 'http://localhost:3000',
        params: { page: 1, limit: 100 },
        headers: { Authorization: 'Bearer fake-token' },
      }),
    );
  });

  it('tenta novamente até 3 vezes em caso de falha e sucede na última', async () => {
    http.get
      .mockReturnValueOnce(throwError(() => new Error('timeout')))
      .mockReturnValueOnce(throwError(() => new Error('timeout')))
      .mockReturnValueOnce(of(mockResponse({ data: [] })));

    const promise = client.getPage(1);
    await jest.runAllTimersAsync();

    const result = await promise;

    expect(http.get).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ data: [] });
  });

  it('lança erro após esgotar as tentativas', async () => {
    http.get.mockReturnValue(throwError(() => new Error('timeout')));

    const promise = client.getPage(1);
    const assertion = expect(promise).rejects.toThrow('timeout'); // anexa o handler AGORA

    await jest.runAllTimersAsync(); // só depois avança os timers
    await assertion;                // aí sim espera o resultado

    expect(http.get).toHaveBeenCalledTimes(3);
  });
});
