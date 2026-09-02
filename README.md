# AppSec Findings API

API responsável por sincronizar, classificar e disponibilizar findings de segurança (SAST/SCA) provenientes de um fornecedor externo de AppSec.

Desenvolvido como parte do case técnico de Fullstack, utilizando **NestJS**, **Prisma ORM** e **PostgreSQL**.

---

## Tecnologias

- NestJS 11
- Prisma ORM 6 + PostgreSQL 16
- TypeScript
- Jest (testes unitários)
- Swagger / OpenAPI
- Docker + Docker Compose

---

## Pré-requisitos

- Docker e Docker Compose
- A [API externa do desafio](https://github.com/andrejr971/interview-test) rodando localmente na porta **3000** (instruções no README daquele repositório)

---

## Como executar

### 1. Suba a API externa (fornecedor de findings)

Em um terminal separado, clone e rode a API do desafio conforme as instruções do repositório:

```bash
git clone https://github.com/andrejr971/interview-test.git
cd interview-test
npm install
npm run dev
```

Confirme que está respondendo em `http://localhost:3000/health`.

> **Por que a API externa não está containerizada junto:** para não alterar a configuração original do repositório de teste (que já roda de forma simples e documentada na porta 3000), optei por mantê-la rodando fora do Docker Compose deste projeto. Isso evita qualquer necessidade de modificar a porta ou o setup da API do fornecedor.

### 2. Suba esta aplicação via Docker Compose

Na raiz deste projeto:

```bash
docker compose up --build
```

Isso vai:

- Subir um container PostgreSQL (`db`)
- Buildar a aplicação NestJS em uma imagem multi-stage
- Aplicar as migrations automaticamente (`prisma migrate deploy`) antes de iniciar
- Expor a API em `http://localhost:3001`

> **Por que a porta 3001 e não 3000:** a API externa do desafio já ocupa a porta 3000 na máquina host. Para evitar conflito sem precisar reconfigurar a API do fornecedor, esta aplicação é exposta na porta **3001** externamente (mapeamento `3001:3000` no `docker-compose.yml`), enquanto internamente, dentro do container, ela continua respondendo na porta 3000 (padrão do Nest).

### 3. Confirme que subiu corretamente

```bash
curl http://localhost:3001/metrics
```

Deve retornar as métricas com `total: 0` (banco ainda vazio, primeira execução).

---

## Documentação da API

Com a aplicação rodando, a documentação Swagger/OpenAPI está disponível em:

```
http://localhost:3001/docs
```

Todos os endpoints, parâmetros e schemas podem ser explorados e testados diretamente por ali.

---

## Endpoints

### `POST /sync`

Consome todas as páginas da API externa (respeitando o limite de 100 registros por página), aplica as regras de classificação e persiste os findings no banco.

```bash
curl -X POST http://localhost:3001/sync
```

A sincronização é **idempotente**: pode ser executada quantas vezes forem necessárias sem duplicar registros. Findings já existentes são atualizados (`score`, `status`, `classification`) em vez de recriados.

### `GET /issues`

Lista findings com paginação e filtros.

| Parâmetro        | Tipo                           | Descrição                                   |
| ---------------- | ------------------------------ | ------------------------------------------- |
| `page`           | number                         | Página atual (padrão: 1)                    |
| `limit`          | number                         | Registros por página, máx. 100 (padrão: 20) |
| `repository`     | string                         | Filtra por repositório                      |
| `type`           | `SAST` \| `SCA`                | Filtra por tipo do finding                  |
| `status`         | `OPEN` \| `FIXED` \| `IGNORED` | Filtra por status                           |
| `classification` | `P1`..`P5`                     | Filtra por classificação calculada          |

```bash
curl "http://localhost:3001/issues?type=SAST&status=OPEN&page=1&limit=20"
```

### `GET /issues/:id`

Busca um finding específico.

> **Premissa adotada:** o parâmetro `:id` corresponde ao **`externalId`** retornado pela API externa (ex: `ISS-000001`), não ao identificador interno (`uuid`) gerado pelo banco. Essa escolha foi feita porque o `externalId` é o identificador "de negócio", mais legível e é o mesmo valor já exibido na listagem — evitando que o cliente da API precise descobrir um uuid interno para buscar um finding específico.

```bash
curl http://localhost:3001/issues/ISS-000001
```

### `GET /metrics`

Retorna métricas agregadas de todos os findings sincronizados.

```bash
curl http://localhost:3001/metrics
```

```json
{
  "total": 20000,
  "open": 6669,
  "fixed": 6609,
  "ignored": 6722,
  "classification": {
    "P1": 8023,
    "P2": 4568,
    "P3": 2030,
    "P4": 2760,
    "P5": 2619
  }
}
```

---

## Modelagem do banco

Um único model `Finding`, com os campos mínimos exigidos pelo case (`type`, `score`, `category`) e também todos os campos adicionais retornados pela API externa (`branch`, `commit`, `language`, `title`, `description`, `ruleId`, `file`, `line`, `author`, `detectedAt`), já que agregam contexto útil para consulta individual (`GET /issues/:id`) sem custo adicional de sincronização.

Pontos de modelagem relevantes:

- **`externalId` (`@unique`)**: chave usada para garantir idempotência na sincronização via `upsert`. É o `id` retornado pela API externa (ex: `ISS-000001`).
- **`classification`**: calculada durante a sincronização (não vem da API externa) e persistida — nunca recalculada em tempo de leitura.
- **`updatedAtSource`**: campo separado do `updatedAt` interno do Prisma. Representa a data de última atualização informada pela API externa, distinta do controle interno de quando o registro foi persistido/atualizado neste banco.
- Índices em `repository`, `type`, `status` e `classification`, que são os campos usados como filtros no `GET /issues`.

---

## Estratégia de sincronização

O `POST /sync` percorre todas as páginas da API externa sequencialmente (respeitando `hasNext`), e a cada página realiza um `upsert` em lote (transação) por `externalId`:

- Se o finding não existe: é criado com todos os campos, incluindo a classificação calculada.
- Se o finding já existe: apenas `score`, `status`, `classification` e `updatedAtSource` são atualizados — os demais campos, que descrevem o achado em si (categoria, arquivo, linha etc.), não deveriam mudar entre sincronizações.

Isso garante que executar `POST /sync` múltiplas vezes nunca duplica registros e mantém o banco sincronizado com o estado mais recente da fonte.

Falhas de rede ao chamar a API externa têm retry automático (3 tentativas, com backoff simples) antes de propagar o erro.

---

## Regras de classificação

Implementadas como função pura em `src/classification/classification.service.ts`, sem dependência de infraestrutura (banco, HTTP), o que permite testá-la isoladamente.

- **SCA**: classificado exclusivamente pelo `score`.
- **SAST**: classificação inicial pelo `score`, promovida em um nível caso a categoria esteja na lista de categorias prioritárias (SQL Injection, Command Injection, Remote Code Execution, SSRF, Authentication Bypass, Deserialization, Hardcoded Secret, Hardcoded Password, Path Traversal). Nunca ultrapassa `P1`.

Os testes unitários cobrem todos os exemplos apresentados no enunciado do case.

---

## Testes

```bash
npm run test        # testes unitários
npm run test:cov     # com relatório de cobertura
```

Cobertura atual:

- `ClassificationService` — todos os cenários de score/categoria/promoção do enunciado
- `SyncService` — paginação, upsert, idempotência, propagação de erro
- `ExternalApiClient` — sucesso, retry com backoff, esgotamento de tentativas (usando fake timers)
- `FindingsService` — filtros combinados, paginação, busca por id, 404

---

## Estrutura do projeto

```
src/
  prisma/               # PrismaService (conexão com o banco)
  classification/        # Motor de classificação (função pura + testes)
  sync/                   # POST /sync — client HTTP externo + orquestração da sincronização
  findings/               # GET /issues, GET /issues/:id
  metrics/                # GET /metrics
  app.module.ts
  main.ts
```

Cada módulo de feature é auto-contido (controller, service, DTOs e testes na mesma pasta), seguindo a convenção idiomática do NestJS.

---

## Variáveis de ambiente

| Variável             | Descrição                                                 | Exemplo                                                             |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`       | Connection string do PostgreSQL                           | `postgresql://postgres:postgres@db:5432/interviewapi?schema=public` |
| `EXTERNAL_API_URL`   | URL base da API externa de findings                       | `http://host.docker.internal:3000`                                  |
| `EXTERNAL_API_TOKEN` | Bearer token (qualquer UUID válido) enviado à API externa | `550e8400-e29b-41d4-a716-446655440000`                              |
| `PORT`               | Porta interna em que a aplicação escuta (opcional)        | `3000`                                                              |

Já configuradas no `docker-compose.yml` para o ambiente containerizado.

---

## Decisões e premissas adicionais

- **Banco de dados**: PostgreSQL, conforme preferência indicada no case.
- **Persistência de campos extras da API externa**: todos os campos retornados (`branch`, `commit`, `language`, `title`, `description`, `ruleId`, `file`, `line`, `author`) foram persistidos, mesmo não sendo todos exigidos explicitamente, por agregarem contexto útil sem custo relevante de armazenamento ou performance.
- **`status`**: o valor é espelhado diretamente do que a API externa retorna (`OPEN`, `FIXED`, `IGNORED`) — não há lógica de negócio própria sobre esse campo além da persistência.
- **Validação de tipos vindos da API externa**: os campos `type` e `status`, que chegam como `string` da fonte externa, são validados explicitamente antes de serem persistidos como enum no banco — evitando que um valor inesperado quebre a sincronização silenciosamente ou gere um erro genérico do Postgres no meio do processamento de 20 mil registros.
