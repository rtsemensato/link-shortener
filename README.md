# Link Shortener API

Encurtador de links completo: autenticação com JWT (access + refresh token
rotativo), CRUD de links com slug automático ou customizado, redirect
público com contagem de cliques, e estatísticas por link. Rate limiting,
validação de entrada e documentação OpenAPI (Swagger).

## Estrutura do repositório

```
src/
├── main.ts               # bootstrap: ValidationPipe global, CORS, Swagger em /api/docs
├── app.module.ts          # ThrottlerModule, ConfigModule, monta os outros módulos
├── app.controller.ts      # GET /health
├── prisma/
│   ├── prisma.service.ts  # PrismaClient como provider Nest (@Global)
│   └── prisma.module.ts
├── auth/
│   ├── auth.controller.ts # /auth/register, login, refresh, logout
│   ├── auth.service.ts    # hash de senha, emissão e rotação de tokens
│   ├── dto/                # RegisterDto, LoginDto, RefreshTokenDto (class-validator)
│   ├── strategies/          # JwtStrategy (passport-jwt)
│   ├── guards/               # JwtAuthGuard
│   ├── decorators/            # @CurrentUser()
│   └── utils/                  # parsing de duração ("15m", "30d") pra segundos/Date
└── links/
    ├── links.controller.ts   # /links (protegido)
    ├── redirect.controller.ts # GET /:slug (público, catch-all)
    ├── links.service.ts       # CRUD, geração de slug, contagem de clique, stats
    └── dto/
prisma/
├── schema.prisma
└── migrations/
test/
├── auth.e2e-spec.ts
├── links.e2e-spec.ts
├── redirect.e2e-spec.ts
├── throttling.e2e-spec.ts
└── utils/
```

## Rodando localmente

```bash
docker compose up -d          # Postgres local, porta 5434
cp .env.example .env          # ajustar os JWT_*_SECRET antes de produção
npm install
npx prisma migrate dev        # aplica as migrations
npm run start:dev
```

API sobe em [http://localhost:3000](http://localhost:3000). Docs interativas
(Swagger) em `/api/docs`.

## Testes

```bash
# banco de teste separado (uma vez só)
docker compose exec db psql -U linkshortener -d postgres -c "CREATE DATABASE linkshortener_test;"
DATABASE_URL="postgresql://linkshortener:linkshortener_dev@localhost:5434/linkshortener_test?schema=public" npx prisma migrate deploy

npm test        # unitários (Jest)
npm run test:e2e # e2e (Jest + Supertest), contra linkshortener_test via .env.test
```

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 11 |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`), senha hasheada em bcrypt |
| Validação | class-validator + class-transformer (`ValidationPipe` global) |
| Rate limiting | `@nestjs/throttler` |
| Docs | `@nestjs/swagger` (OpenAPI) |
| Testes | Jest (unitário) + Jest/Supertest (e2e) |

## Endpoints principais

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/register` | — | Cria uma conta |
| POST | `/auth/login` | — | Login, retorna access + refresh token (limitado a 5/min) |
| POST | `/auth/refresh` | — | Troca um refresh token válido por um par novo (rotação) |
| POST | `/auth/logout` | — | Invalida o refresh token informado |
| POST | `/links` | JWT | Cria um link (`originalUrl`, `customSlug` opcional) |
| GET | `/links` | JWT | Lista os links do usuário autenticado |
| GET | `/links/:id/stats` | JWT | Total de cliques + cliques por dia (30 dias) |
| DELETE | `/links/:id` | JWT | Remove um link próprio |
| GET | `/:slug` | — | Redireciona (302) pra URL original e registra o clique |

## Decisões técnicas

### Refresh token: hash SHA-256, não bcrypt

Senha usa bcrypt (lento, com salt, pensado pra resistir a força bruta
offline sobre um segredo de baixa entropia digitado por humano). Refresh
token é uma string aleatória de 48 bytes, alta entropia, gerada pelo
servidor: um hash determinístico (SHA-256) já é suficiente pra guardá-lo
com segurança e ainda permite buscar por igualdade no banco pra validar/
revogar. Usar bcrypt aqui seria mais lento sem ganho real de segurança.

### Refresh token com rotação

A cada `/auth/refresh` bem-sucedido, o token usado é apagado do banco e um
par novo é emitido. Um refresh token usado duas vezes falha na segunda
tentativa. Reduz a janela de uso de um token vazado.

### `/:slug` é um catch-all, ordem de registro importa

O redirect público vive num controller próprio (`RedirectController`),
sem guard, registrado **depois** de `AppController` (`/health`) e de
`LinksController` (`/links/*`) em `LinksModule.controllers`. Rotas
literais registradas antes têm prioridade sobre `:slug` de um segmento
só. Além disso, `LinksService` rejeita a criação de um link cujo slug
colida com uma rota reservada (`health`, `api`, `auth`, `links`), pra não
criar um link que nunca seria alcançável.

### Rate limiting nos testes

O `ThrottlerGuard` global (via `APP_GUARD`) fica ativo nos testes e2e por
padrão, e `/auth/login` tem um limite de 5/min mesmo em teste. A suíte e2e
autentica **uma vez por arquivo** (`beforeAll`), não a cada teste, pra não
estourar esse limite. O comportamento de throttling em si tem uma suíte
própria (`throttling.e2e-spec.ts`) que cria sua própria instância da app
sem esse cuidado, justamente pra provar que o limite dispara de verdade.

Ver [`CLAUDE.md`](CLAUDE.md) pra mais detalhes de arquitetura e uma
pegadinha real de teste que já aconteceu aqui (override de guard global
que não funcionava).

## Deploy

- **API**: Render (free tier), com Postgres gerenciado (Render Postgres, ou
  Neon/Supabase). Configurar `DATABASE_URL`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET` e `BASE_URL` (URL pública da própria API, usada pra
  montar o `shortUrl` nas respostas) como variáveis de ambiente.
- Build: `npm install && npx prisma migrate deploy && npm run build`.
  Start: `npm run start:prod`.
