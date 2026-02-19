import { describe, test, expect } from 'vitest';
import {
  isValidUrl,
  isValidNpub,
  isValidNsec,
  isValidNip05Address,
  isValidBip39Word,
  isValidBip39Phrase
} from './validation.js';

describe('validation', () => {
  test('url', () => {
    const tests = [
      {
        text: 'http://www.example.com:777/a/b?c=d&e=f#g',
        expected: true
      },
      {
        text: 'invalid url',
        expected: false
      },
      {
        text: 'ftp://www.example.com/hello',
        protocols: [],
        expected: true
      },
      {
        text: 'ws://www.example.com:777/a/b?c=d&e=f#g',
        protocols: ['http', 'https'],
        expected: false
      },
      {
        text: 'ws://www.example.com:777/a/b?c=d&e=f#g',
        protocols: ['http', 'ws'],
        expected: true
      }
    ];

    for (let t of tests) {
      let isValid = t.protocols ? isValidUrl(t.text, t.protocols) : isValidUrl(t.text);
      expect(isValid, `Should return ${t.expected} for text ${t.text} and protocols ${t.protocols}`).toEqual(
        t.expected
      );
    }
  });

  test('npub', () => {
    const tests = [
      {
        text: 'npub1gl95sqflrhgnvtvfjnnzzsnmcmdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: true
      },
      {
        text: '1gl95sqflrhgnvtvfjnnzzsnmcmdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: 'npubdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: 'nsec1gl95sqflrhgnvtvfjnnzzsnmcmdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: '9999999999999',
        expected: false
      }
    ];

    for (let t of tests) {
      let isValid = isValidNpub(t.text);
      expect(isValid, `Should return ${t.expected} for text ${t.text}`).toEqual(t.expected);
      // assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }
  });

  test('nsec', () => {
    const tests = [
      {
        text: 'nsec1d3nsxh2yg00h6kr5cmeyg5aec40exu3jfx9qhrcl9tmsr0n9y6mqfdjtk3',
        expected: true
      },
      {
        text: '1gl95sqflrhgnvtvfjnnzzsnmcmdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: 'nsecdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: 'npub1gl95sqflrhgnvtvfjnnzzsnmcmdq2vg5txwpqvttafunx9ztl0ns88chl8',
        expected: false
      },
      {
        text: '9999999999999',
        expected: false
      }
    ];

    for (let t of tests) {
      let isValid = isValidNsec(t.text);
      expect(isValid, `Should return ${t.expected} for text ${t.text}`).toEqual(t.expected);
      // assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }
  });

  test('nip05 address', () => {
    const tests = [
      {
        text: 'example@domain.com',
        expected: true
      },
      {
        text: 'domain.com',
        expected: true
      },
      {
        text: 'invalid@@',
        expected: false
      },
      {
        text: 'blahblah',
        expected: false
      }
    ];

    for (let t of tests) {
      let isValid = isValidNip05Address(t.text);
      expect(isValid, `Should return ${t.expected} for text ${t.text}`).toEqual(t.expected);
      // assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }
  });

  test('bip39 mnemonic, individual word', () => {
    const tests = [
      {
        text: 'weasel',
        expected: true
      },
      {
        text: 'sausage',
        expected: true
      },
      {
        text: 'invalid@@',
        expected: false
      },
      {
        text: 'blahblah',
        expected: false
      }
    ];

    for (let t of tests) {
      let isValid = isValidBip39Word(t.text);
      expect(isValid, `Should return ${t.expected} for word ${t.text}`).toEqual(t.expected);
      // assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for word ${t.text}` )
    }
  });

  test('bip39 mnemonic, full phrase', () => {
    const tests = [
      {
        text: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        expected: true
      },
      {
        text: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo',
        expected: false
      },
      {
        text: 'invalid@@',
        expected: false
      },
      {
        text: '',
        expected: false
      }
    ];

    for (let t of tests) {
      let isValid = isValidBip39Phrase(t.text);
      expect(isValid, `Should return ${t.expected} for word ${t.text}`).toEqual(t.expected);
      // assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for word ${t.text}` )
    }
  });
});
