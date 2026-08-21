const MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Converte uma duração curta ("30d", "15m", "500ms") num Date futuro a
 * partir de `base`. Evita puxar uma lib inteira (ex: `ms`) só pra isso.
 */
export function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Duração inválida: "${duration}". Use algo como "30d", "15m", "500ms".`,
    );
  }

  const [, amount, unit] = match;
  return new Date(base.getTime() + Number(amount) * MULTIPLIERS[unit]);
}

/**
 * Mesmo parser, mas em segundos. Usado pro `expiresIn` do @nestjs/jwt, cujo
 * tipo aceita `number` (segundos) sem a ginástica de tipo que uma string
 * literal exigiria vinda de uma variável de ambiente.
 */
export function parseDurationSeconds(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Duração inválida: "${duration}". Use algo como "30d", "15m", "500ms".`,
    );
  }

  const [, amount, unit] = match;
  return Math.floor((Number(amount) * MULTIPLIERS[unit]) / 1000);
}
