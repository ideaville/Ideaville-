import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AppError } from './errors.ts'
import { hashPassword, newId, nowIso } from './crypto.ts'
import { createApp } from './app.ts'
import { createTestStore, resetStoreSingleton } from './store/index.ts'
import { seedHistoricDrafts } from './seed.ts'

describe('OMEGA referral network', () => {
  it('seeds Kay partner with attributable referral code', async () => {
    const store = createTestStore()
    await seedHistoricDrafts(store)
    const kay = (await store.listDistributors()).find((d) => d.code === 'KAY-PARTNER')
    assert.ok(kay)
    assert.equal(kay.referral_code, 'KAY-PARTNER')
    assert.equal(kay.sponsor_id, null)
    assert.equal(kay.status, 'pending_terms')
  })

  it('records referrals only for the signed-in distributor tenant', async () => {
    const store = createTestStore()
    await seedHistoricDrafts(store)
    const kay = (await store.listDistributors()).find((d) => d.code === 'KAY-PARTNER')!
    const other = await store.createDistributor({
      id: newId(),
      name: 'Other Partner',
      code: 'OTHER-1',
      status: 'active',
      notes: '',
      sponsor_id: kay.id,
      referral_code: 'OTHER-1',
      created_at: nowIso(),
    })
    const kayUser = await store.createUser({
      id: newId(),
      email: 'kay@test',
      password_hash: await hashPassword('distributor-password'),
      role: 'distributor',
      distributor_id: kay.id,
      active: true,
    })
    await store.createReferral({
      id: newId(),
      referrer_distributor_id: kay.id,
      referrer_user_id: kayUser.id,
      code: kay.referral_code,
      prospect_label: 'Lagos intro',
      status: 'recorded',
      attributed_order_id: null,
      notes: '',
      created_at: nowIso(),
    })
    await store.createReferral({
      id: newId(),
      referrer_distributor_id: other.id,
      referrer_user_id: null,
      code: other.referral_code,
      prospect_label: 'Other intro',
      status: 'recorded',
      attributed_order_id: null,
      notes: '',
      created_at: nowIso(),
    })

    const kayOnly = await store.listReferrals({ referrerDistributorId: kay.id })
    assert.equal(kayOnly.length, 1)
    assert.equal(kayOnly[0].prospect_label, 'Lagos intro')

    const sponsored = (await store.listDistributors()).filter((d) => d.sponsor_id === kay.id)
    assert.equal(sponsored.length, 1)
    assert.equal(sponsored[0].code, 'OTHER-1')
  })

  it('lookup fails closed when persistence is unconfigured', async () => {
    resetStoreSingleton()
    delete process.env.DATABASE_URL
    delete process.env.OMEGA_ALLOW_MEMORY_STORE
    const app = createApp()
    const res = await app.request('/api/referrals/lookup?code=KAY-PARTNER')
    assert.equal(res.status, 503)
    resetStoreSingleton()
  })

  it('refuses self-sponsorship', async () => {
    const store = createTestStore()
    const d = await store.createDistributor({
      id: newId(),
      name: 'Solo',
      code: 'SOLO',
      status: 'active',
      notes: '',
      sponsor_id: null,
      referral_code: 'SOLO',
      created_at: nowIso(),
    })
    await assert.rejects(
      () => store.updateDistributor(d.id, { sponsor_id: d.id }),
      (err: unknown) => err instanceof AppError && err.status === 400,
    )
  })
})
