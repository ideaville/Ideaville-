import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyReferral, makeCode, nextRank } from './clubLogic.ts'

describe('clubLogic', () => {
  it('builds an OMG referral code from a name stem', () => {
    assert.equal(makeCode('Alex', 4242), 'OMG-ALEX-4242')
  })

  it('pads short names and strips non-letters', () => {
    assert.equal(makeCode('Jo!', 1001), 'OMG-JOXX-1001')
  })

  it('promotes ranks by referrals and volume', () => {
    assert.equal(nextRank(2, 100), 'member')
    assert.equal(nextRank(3, 100), 'advocate')
    assert.equal(nextRank(5, 2500), 'partner')
    assert.equal(nextRank(20, 10000), 'executive')
  })

  it('never demotes below an existing floor rank', () => {
    assert.equal(nextRank(0, 0, 'advocate'), 'advocate')
  })

  it('applies commission on referral sales', () => {
    const next = applyReferral(
      { referrals: 0, volume: 0, earnings: 0, rank: 'advocate' },
      100,
    )
    assert.equal(next.referrals, 1)
    assert.equal(next.volume, 100)
    assert.equal(next.earnings, 15)
    assert.equal(next.rank, 'advocate')
  })
})

