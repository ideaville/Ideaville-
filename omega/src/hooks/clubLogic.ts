import type { RankId } from '../data/network'

const rankOrder: RankId[] = ['member', 'advocate', 'partner', 'executive']

export function makeCode(name: string, suffix = Math.floor(1000 + Math.random() * 9000)): string {
  const stem = name
    .trim()
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
  current: { referrals: number; volume: number; earnings: number; rank: RankId },
  saleValue = 48,
) {
  const referrals = current.referrals + 1
  const volume = current.volume + saleValue
  const earnings = Number((current.earnings + saleValue * 0.15).toFixed(2))
  const rank = nextRank(referrals, volume, current.rank)
  return { referrals, volume, earnings, rank }
}
