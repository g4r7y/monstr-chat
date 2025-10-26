import { stringIsAValidUrl } from './validation.js'
import { test } from 'node:test'
import assert from 'node:assert'

test('url validation', () => {
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
    assert.deepEqual(isValid, t.expected, `Should return ${t.expected} for text ${t.text} and protocols ${t.protocols}` )
  }

})