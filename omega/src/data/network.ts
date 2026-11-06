export type RankId = 'member' | 'advocate' | 'partner' | 'executive'

export type Rank = {
  id: RankId
  name: string
  headline: string
  entry: string
  commission: string
  residual: string
  perks: string[]
}

export const ranks: Rank[] = [
  {
    id: 'member',
    name: 'Member',
    headline: 'Drive with OMEGA',
    entry: 'Purchase a starter kit',
    commission: 'Member pricing',
    residual: '—',
    perks: ['Preferred retail pricing', 'Product education drops', 'Club events access'],
  },
  {
    id: 'advocate',
    name: 'Advocate',
    headline: 'Share the formula',
    entry: '3 verified referrals',
    commission: '15% on direct sales',
    residual: '5% on second-line orders',
    perks: ['Personal referral link', 'Tracked payouts', 'Priority restock alerts'],
  },
  {
    id: 'partner',
    name: 'Partner',
    headline: 'Build a cell',
    entry: '£2,500 monthly team volume',
    commission: '20% on direct sales',
    residual: '8% across three levels',
    perks: ['Team dashboard', 'Co-branded assets', 'Quarterly performance bonus'],
  },
  {
    id: 'executive',
    name: 'Executive',
    headline: 'Own the territory',
    entry: '£10,000 monthly network volume',
    commission: '25% on direct sales',
    residual: '12% residual + equity pool',
    perks: ['Regional exclusivity path', 'Equity pool eligibility', 'Founders council seat'],
  },
]

export const wealthPillars = [
  {
    title: 'Product velocity',
    body: 'Every bottle sold funds your rank. Retail demand is the floor of the model — not a vanity metric.',
  },
  {
    title: 'Referral leverage',
    body: 'Advocates earn on people they personally introduce. Partners earn on the cells those Advocates grow.',
  },
  {
    title: 'Residual depth',
    body: 'Executives participate in a capped residual pool tied to verified network volume — designed for durability, not hype.',
  },
] as const

export const sampleLedger = [
  { id: 'TX-2401', who: 'Maya R.', event: 'Starter kit', amount: 42.0, status: 'Paid' },
  { id: 'TX-2402', who: 'Jordan K.', event: 'Reorder ×2', amount: 28.5, status: 'Paid' },
  { id: 'TX-2403', who: 'Cell North', event: 'Team residual', amount: 116.0, status: 'Pending' },
  { id: 'TX-2404', who: 'Samira L.', event: 'Advocate unlock', amount: 75.0, status: 'Paid' },
] as const
