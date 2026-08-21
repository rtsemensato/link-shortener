import { addDuration, parseDurationSeconds } from './duration';

describe('addDuration', () => {
  const base = new Date('2026-01-01T00:00:00.000Z');

  it('adds days', () => {
    expect(addDuration(base, '30d')).toEqual(
      new Date('2026-01-31T00:00:00.000Z'),
    );
  });

  it('adds hours', () => {
    expect(addDuration(base, '2h')).toEqual(
      new Date('2026-01-01T02:00:00.000Z'),
    );
  });

  it('adds minutes', () => {
    expect(addDuration(base, '15m')).toEqual(
      new Date('2026-01-01T00:15:00.000Z'),
    );
  });

  it('adds seconds', () => {
    expect(addDuration(base, '90s')).toEqual(
      new Date('2026-01-01T00:01:30.000Z'),
    );
  });

  it('adds milliseconds', () => {
    expect(addDuration(base, '500ms')).toEqual(
      new Date('2026-01-01T00:00:00.500Z'),
    );
  });

  it('throws on an invalid format', () => {
    expect(() => addDuration(base, '30 days')).toThrow('Duração inválida');
    expect(() => addDuration(base, '')).toThrow('Duração inválida');
  });
});

describe('parseDurationSeconds', () => {
  it('converts to seconds', () => {
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('30d')).toBe(2_592_000);
    expect(parseDurationSeconds('90s')).toBe(90);
  });

  it('throws on an invalid format', () => {
    expect(() => parseDurationSeconds('30 days')).toThrow('Duração inválida');
  });
});
