import { test, expect } from 'vitest';
import { wrapText } from './textUtils.js';

test('word wrap', () => {
  const tests = [
    {
      text: '12345 67890',
      width: 5,
      expected: ['12345', '67890']
    },
    {
      text: '1234567890',
      width: 5,
      expected: ['12345', '67890']
    },
    {
      text: '1234 567890',
      width: 5,
      expected: ['1234', '56789', '0']
    },
    {
      text: '12 34 567890',
      width: 5,
      expected: ['12 34', '56789', '0']
    },
    {
      text: '1234567890',
      width: 9,
      expected: ['123456789', '0']
    },
    {
      text: '12345678901234567890123456789012345',
      width: 10,
      expected: ['1234567890', '1234567890', '1234567890', '12345']
    },
    {
      text: '12345 12345  12345    12345',
      width: 10,
      expected: ['12345', '12345', '12345', '12345']
    },
    {
      text: '123 123  123  123    123    123  ',
      width: 10,
      expected: ['123 123', '123  123', '123    123']
    }
  ];

  for (let t of tests) {
    const lines = wrapText(t.text, t.width);
    expect(lines, `Incorrect wrap for text "${t.text}" with width ${t.width}`).toEqual(t.expected);
  }
});
