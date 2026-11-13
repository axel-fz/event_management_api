import { parseDurationToSeconds } from './duration.util';

describe('parseDurationToSeconds', () => {
  it('should parse standard string timespans', () => {
    expect(parseDurationToSeconds('1d')).toBe(86400);
    expect(parseDurationToSeconds('24h')).toBe(86400);
    expect(parseDurationToSeconds('60m')).toBe(3600);
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('1w')).toBe(604800);
  });

  it('should parse quoted or escaped timespan strings', () => {
    expect(parseDurationToSeconds('"1d"')).toBe(86400);
    expect(parseDurationToSeconds("'1d'")).toBe(86400);
    expect(parseDurationToSeconds('\\"1d\\"')).toBe(86400);
    expect(parseDurationToSeconds('“1d”')).toBe(86400);
    expect(parseDurationToSeconds('"24h"')).toBe(86400);
  });

  it('should parse raw numbers and numeric strings', () => {
    expect(parseDurationToSeconds(3600)).toBe(3600);
    expect(parseDurationToSeconds('86400')).toBe(86400);
    expect(parseDurationToSeconds('"86400"')).toBe(86400);
  });

  it('should fallback to 86400 on invalid or missing values', () => {
    expect(parseDurationToSeconds(undefined)).toBe(86400);
    expect(parseDurationToSeconds(null)).toBe(86400);
    expect(parseDurationToSeconds('')).toBe(86400);
    expect(parseDurationToSeconds('invalid_value')).toBe(86400);
    expect(parseDurationToSeconds(-1)).toBe(86400);
  });
});
