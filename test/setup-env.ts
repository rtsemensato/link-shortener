import { config } from 'dotenv';
import { resolve } from 'node:path';

// Carrega .env.test ANTES de qualquer módulo do Nest inicializar (precisa
// rodar antes do PrismaClient ler DATABASE_URL). Sobrescreve qualquer valor
// que já esteja em process.env.
config({ path: resolve(__dirname, '../.env.test'), override: true });
