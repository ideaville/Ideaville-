export const brand = {
  name: 'OMEGA',
  tagline: 'PERFORMANCE ADDITIVES',
  promise: 'Cleaner burn. Sharper response. Longer engine life.',
  volume: '500 ml',
  fuel: 'Petrol only',
  treats: 'Up to 60 litres',
  interval: 'Every 3,000–5,000 miles',
} as const

export const benefits = [
  {
    title: 'Injector clarity',
    body: 'Dissolves varnish and deposits that dull throttle response and waste fuel.',
  },
  {
    title: 'Combustion polish',
    body: 'Stabilises the burn for smoother idle, cleaner plugs, and quieter running.',
  },
  {
    title: 'Protective film',
    body: 'Leaves a micro-layer that resists corrosion across the fuel system.',
  },
] as const

export const directions = [
  'Shake well before use.',
  'Pour the full bottle into a nearly empty tank.',
  'Refuel with petrol so the additive dilutes evenly.',
  'Repeat every 3,000–5,000 miles, or before long journeys.',
] as const

export const storage = [
  'Store upright in a cool, dry place.',
  'Keep away from heat, sparks, and direct sun.',
  'Reseal tightly after opening.',
] as const

export const warnings = [
  'For petrol engines only — not diesel, aviation, or marine two-stroke.',
  'Flammable liquid. Keep away from ignition sources.',
  'Keep out of reach of children. Avoid skin and eye contact.',
  'Do not ingest. If swallowed, seek medical help immediately.',
] as const
