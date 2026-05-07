import { describe, expect, it } from 'vitest';

import {
  normalizeJsonbInput,
  parseDbJsonRecord,
  parseDbJsonValue,
  serializeDbJsonValue,
  stringifyDbJsonValue,
} from './db-json';

describe('db json helpers', () => {
  it('keeps existing objects intact for jsonb columns', () => {
    const payload = {
      status: 'done',
      nested: {
        video: 'https://cdn.example.com/output.mp4',
      },
    };

    expect(normalizeJsonbInput(payload)).toEqual(payload);
    expect(parseDbJsonValue(payload)).toEqual(payload);
    expect(parseDbJsonRecord(payload)).toEqual(payload);
  });

  it('parses legacy stringified json payloads', () => {
    const payload =
      '{"status":"done","videos":[{"url":"https://cdn.example.com/output.mp4"}]}';

    expect(parseDbJsonRecord(payload)).toEqual({
      status: 'done',
      videos: [{ url: 'https://cdn.example.com/output.mp4' }],
    });
    expect(normalizeJsonbInput(payload)).toEqual({
      status: 'done',
      videos: [{ url: 'https://cdn.example.com/output.mp4' }],
    });
  });

  it('drops blank values instead of writing meaningless jsonb content', () => {
    expect(normalizeJsonbInput('')).toBeNull();
    expect(normalizeJsonbInput('   ')).toBeNull();
    expect(parseDbJsonValue('')).toBeNull();
    expect(parseDbJsonRecord('')).toBeNull();
  });

  it('preserves structured values when preparing jsonb writes', () => {
    const payload = {
      errorCode: 'OutputVideoSensitiveContentDetected',
      errorMessage: 'blocked',
    };

    expect(serializeDbJsonValue(payload)).toEqual(payload);
    expect(serializeDbJsonValue('[1,2,3]')).toEqual([1, 2, 3]);
    expect(serializeDbJsonValue('plain text')).toBe('plain text');
  });

  it('stringifies non-string values while preserving existing strings', () => {
    expect(stringifyDbJsonValue({ status: 'done' })).toBe('{"status":"done"}');
    expect(stringifyDbJsonValue('{"status":"done"}')).toBe('{"status":"done"}');
    expect(stringifyDbJsonValue('')).toBeNull();
  });
});
