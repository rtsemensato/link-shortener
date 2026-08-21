# CLAUDE.md — Link Shortener API

Stack: NestJS 11 + Prisma + PostgreSQL + JWT (passport-jwt)

Encurtador de links com autenticação, CRUD de links, redirect público com
contagem de clique, rate limiting e docs OpenAPI. Sem frontend.

---

## Arquitetura em uma linha

`AuthModule` (JWT access curto + refresh rotativo, senha bcrypt) →
`JwtAuthGuard` protege `LinksController` (`/links/*`) → `LinksService`
(CRUD, geração de slug, `$transaction` no clique) → `RedirectController`
(`/:slug`, público, catch-all, registrado por último)

---

## Ordem de registro de controllers importa

`/:slug` em `RedirectController` é um catch-all de um segmento só. Pra
`/health` (AppController) e `/links/*` (LinksController) não serem
capturados por ele, a ordem de registro precisa colocar rotas literais
antes:

1. `AppModule.controllers = [AppController]` (registra `/health` primeiro)
2. `AppModule.imports` inclui `LinksModule` cujo `controllers` array é
   `[LinksController, RedirectController]` (`LinksController` antes)

Além disso, `LinksService.create()` rejeita um `customSlug` que bata com
`RESERVED_SLUGS` (`health`, `api`, `auth`, `links`), porque mesmo com a
ordem certa, um link com esse slug nunca seria alcançado pelo redirect.

**Se adicionar um novo controller/módulo com rota literal de um segmento
só** (tipo `/algo`), ele precisa ser registrado antes de `LinksModule` na
lista de `imports`/`controllers`, ou seu path precisa entrar em
`RESERVED_SLUGS`.

## Refresh token: hash SHA-256, não bcrypt

Ver detalhes em README.md. Resumo pra quem for mexer em `auth.service.ts`:
senha usa `bcrypt.hash`/`bcrypt.compare` (BCRYPT_ROUNDS = 10). Refresh
token usa `createHash('sha256')`, porque é uma string aleatória de alta
entropia (não uma senha), e precisa ser buscável por igualdade
determinística no banco. Não trocar um pelo outro sem motivo forte.

## `expiresIn` do JWT precisa ser número (segundos), não string

`@nestjs/jwt`'s `signAsync(payload, { expiresIn })` tem um tipo restrito
(`number | StringValue`) que uma `string` genérica vinda de
`ConfigService.get<string>(...)` não satisfaz sem gambiarra de tipo. A
solução usada foi `parseDurationSeconds()` (`src/auth/utils/duration.ts`),
que converte `"15m"`/`"30d"` pra segundos. Não trocar por um cast `as any`
só pra silenciar o erro, o parser já resolve isso de forma tipada.

## Rate limiting nos testes: `overrideGuard` não funciona aqui

`test/utils/create-test-app.ts` desliga o `ThrottlerGuard` pra todos os
e2e, exceto `throttling.e2e-spec.ts`. **Isso foi tentado de duas formas
que pareciam corretas e não funcionaram**, antes de chegar na que
funciona:

1. `.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })`
   — não intercepta o guard registrado globalmente via
   `{ provide: APP_GUARD, useClass: ThrottlerGuard }` em `AppModule`. O
   guard real continuava rodando, comprovado rodando a suíte com e sem
   esse override (mesmo resultado nos dois casos).
2. `.overrideProvider(APP_GUARD).useValue({ canActivate: () => true })` —
   mesmo resultado do item 1, também não funcionou.

**O que resolveu de verdade**: não depender de override nenhum. Em vez
disso, os specs autenticam **uma vez por arquivo** (`beforeAll`), não a
cada teste (`beforeEach`), e usam `cleanLinksAndClicks()` (não
`cleanDatabase()`) entre testes pra preservar o usuário já logado. Isso
mantém o número de chamadas a `/auth/login` bem abaixo do limite real
(5/min), sem precisar desligar nada.

Se um override de guard global parecer necessário de novo no futuro,
desconfiar: pode não estar funcionando silenciosamente (sem erro, só o
comportamento real continuando ativo). Confirmar rodando a suíte com e
sem o override e comparando o resultado, não assumir que funcionou só
porque não deu erro de compilação.

## `throttling.e2e-spec.ts` é a exceção de propósito

Essa suíte cria sua própria instância da app (não usa
`test/utils/create-test-app.ts`), justamente pra manter o `ThrottlerGuard`
real ativo e provar que `/auth/login` bloqueia depois de 5 tentativas em
60s. Não migrar esse arquivo pro helper `createTestApp()`.

---

## O que evitar

- **Rodar `npm run test:e2e` sem `--runInBand`.** Os specs rodam em
  paralelo por padrão, e todos compartilham o mesmo banco Postgres de
  teste com `cleanDatabase()`/`cleanLinksAndClicks()` destrutivo entre
  testes, causa corrida de dados entre arquivos. O script já inclui a
  flag; não remover.
- **Voltar a autenticar em `beforeEach` nos specs de links/redirect.**
  Já causou 429 real (rate limit de login) só de rodar a suíte, ver seção
  acima.
- **Confiar que `overrideGuard`/`overrideProvider` desligou um guard
  global só porque a chamada não deu erro.** Ver seção acima, comprovar
  rodando a suíte.
- **Adicionar uma rota literal de um segmento só sem registrar antes de
  `LinksModule`** (ou sem adicionar em `RESERVED_SLUGS`).
- **Usar bcrypt pra hashear o refresh token**, ou SHA-256 puro pra
  senha. São escolhas deliberadas e opostas, ver seção acima.
