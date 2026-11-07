import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPlausiblePhone } from '../src/lib/phone.ts'

describe('phone validation', () => {
  it('accepts +234 and spaced international numbers', () => {
    assert.equal(isPlausiblePhone('+234 801 234 5678'), true)
    assert.equal(isPlausiblePhone('+2348012345678'), true)
    assert.equal(isPlausiblePhone('0801 234 5678'), true)
  })

  it('rejects empty and too-short values without requiring rigid 11 digits', () => {
    assert.equal(isPlausiblePhone(''), false)
    assert.equal(isPlausiblePhone('12345'), false)
    assert.equal(isPlausiblePhone('+234 801'), false)
  })
})
