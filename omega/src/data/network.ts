export type RankId = 'member' | 'advocate' | 'partner' | 'executive'

export type Rank = {
  id: RankId
  name: string
  headline: string
  entry: string
  /** Sales-facing: never show unverified payout numbers here. */
  commercialStatus: string
  intent: string[]
}

/**
 * Rank structure preserved for the demo ladder.
 * Commission %, residuals, and equity-pool figures are NOT approved commercial terms
 * and must not appear on sales-facing surfaces.
 */
export const ranks: Rank[] = [
  {
    id: 'member',
    name: 'Member',
    headline: 'Drive with OMEGA',
    entry: 'Concept: product customer',
    commercialStatus: 'Payout terms pending approval',
    intent: ['Product education access', 'Club concept visibility'],
  },
  {
    id: 'advocate',
    name: 'Advocate',
    headline: 'Share the brand',
    entry: 'Concept: personal referrals (threshold TBD)',
    commercialStatus: 'Payout terms pending approval',
    intent: ['Demo referral code', 'Education-first sharing'],
  },
  {
    id: 'partner',
    name: 'Partner',
    headline: 'Build a cell',
    entry: 'Concept: team volume (threshold TBD)',
    commercialStatus: 'Payout terms pending approval',
    intent: ['Team demo dashboard', 'Co-branded asset concepts'],
  },
  {
    id: 'executive',
    name: 'Executive',
    headline: 'Own the territory',
    entry: 'Concept: network volume (threshold TBD)',
    commercialStatus: 'Equity / residual ideas deferred — not offered',
    intent: ['Regional concept seat', 'No live equity promise'],
  },
]

export const networkPillars = [
  {
    title: 'Product first',
    body: 'Any future network must rest on real product demand — not recruitment theatre.',
  },
  {
    title: 'Referral concept',
    body: 'Sharing tools are prototyped here as a non-transactional demo. No live signups or payouts.',
  },
  {
    title: 'Commercial terms',
    body: 'Commission rates, residuals, and equity-pool language from earlier drafts are unverified and withheld pending owner approval.',
  },
] as const

/** Clearly fictional mock rows — not linked to demo counters and not real money. */
export const sampleLedger = [
  { id: 'MOCK-01', who: 'Demo user A', event: 'Fictional starter', units: 10, status: 'Mock' },
  { id: 'MOCK-02', who: 'Demo user B', event: 'Fictional reorder', units: 6, status: 'Mock' },
  { id: 'MOCK-03', who: 'Demo cell', event: 'Fictional residual', units: 22, status: 'Mock' },
  { id: 'MOCK-04', who: 'Demo user C', event: 'Fictional unlock', units: 12, status: 'Mock' },
] as const
