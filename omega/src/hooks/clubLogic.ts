import type { RankId } from '../data/network'

const rankOrder: RankId[] = ['member', 'advocate', 'partner', 'executive']

export const MAX_DISPLAY_NAME = 40

/** Demo-only point increment — not a commission rate or currency. */
export const DEMO_POINTS_PER_REFERRAL = 10

export function sanitizeDisplayName(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} .'-]/gu, '')
    .trim()
    .slice(0, MAX_DISPLAY_NAME)
}

export function makeCode(name: string, suffix = Math.floor(1000 + Math.random() * 9000)): string {
  const stem = sanitizeDisplayName(name)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X')
  return `OMG-${stem}-${suffix}`
}

export function nextRank(referrals: number, volume: number, floor: RankId = 'member'): RankId {
  let rank: RankId = 'member'
  if (referrals >= 3) rank = 'advocate'
  if (volume >= 2500) rank = 'partner'
  if (volume >= 10000) rank = 'executive'
  return rankOrder.indexOf(rank) >= rankOrder.indexOf(floor) ? rank : floor
}

export function applyReferral(
  current: { referrals: number; volume: number; demoPoints: number; rank: RankId },
  saleValue = 48,
) {
  const referrals = current.referrals + 1
  const volume = current.volume + saleValue
  const demoPoints = current.demoPoints + DEMO_POINTS_PER_REFERRAL
  const rank = nextRank(referrals, volume, current.rank)
  return { referrals, volume, demoPoints, rank }
}

export function isRankId(value: unknown): value is RankId {
  return value === 'member' || value === 'advocate' || value === 'partner' || value === 'executive'
}
