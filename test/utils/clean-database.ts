import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Limpa todas as tabelas, na ordem certa por causa das foreign keys. Roda contra o banco de `.env.test`. */
export async function cleanDatabase(): Promise<void> {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Limpa só links e clicks, preservando usuários e refresh tokens. Usado
 * entre testes que autenticam uma vez em `beforeAll` (não a cada teste), pra
 * não estourar o rate limit de `/auth/login` (5/min) repetindo
 * registro+login em toda run.
 */
export async function cleanLinksAndClicks(): Promise<void> {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
