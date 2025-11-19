import { stringIsAValidUrl, stringIsValidNpub, stringIsValidNsec, stringIsValidNostrAddress } from './validation.js'
import { describe, test } from 'node:test'
import assert from 'node:assert'

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
        protocols: ['http','https'], 
        expected: false 
      },
      { 
        text: 'ws://www.example.com:777/a/b?c=d&e=f#g',
        protocols: ['http','ws'], 
        expected: true 
      },
    ]

    for(let t of tests) {
      let isValid = t.protocols ? stringIsAValidUrl(t.text, t.protocols) :  stringIsAValidUrl(t.text)
      assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text} and protocols ${t.protocols}` )
    }

  })

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
      },
    ]

    for(let t of tests) {
      let isValid = stringIsValidNpub(t.text)
      assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }
  })

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
      },
    ]

    for(let t of tests) {
      let isValid = stringIsValidNsec(t.text)
      assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }

  })

  test('nostr address', () => {
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
    ]

    for(let t of tests) {
      let isValid = stringIsValidNostrAddress(t.text)
      assert.strictEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text}` )
    }
  })


})