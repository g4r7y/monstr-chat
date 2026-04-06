import { describe, expect, test } from 'vitest';
import hashStrings from './hash.js';

describe('hash', () => {
  const strings = [...new Array(500)].map(() => {
    return [...new Array(20)]
      .map(() => {
        return String.fromCharCode(64 + Math.random() * 32);
      })
      .join('');
  });

  test('is deterministic', () => {
    const hash1 = hashStrings(strings);
    expect(hashStrings(strings)).toEqual(hash1);
    expect(hashStrings(strings)).toEqual(hash1);
    expect(hashStrings(strings)).toEqual(hash1);
  });

  test('is somewhat collision proof', () => {
    const hash1 = hashStrings(strings);
    for (let n = 0; n < 500; n++) {
      expect(hashStrings(strings.splice(n, 1))).not.toEqual(hash1);
    }
  });

  test('is independent of order', () => {
    const res1 = hashStrings(strings);
    const res2 = hashStrings(strings.reverse());
    expect(res1).toEqual(res2);
  });
});
