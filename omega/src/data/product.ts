export const brand = {
  name: 'OMEGA',
  tagline: 'PERFORMANCE ADDITIVES',
  promise: 'A petrol-only performance additive concept for drivers who want a cleaner fuel-system ritual.',
  fuel: 'Petrol only',
  market: 'Nigeria first · UK deferred',
  volume: 'Retail volume pending (30 ml vs 50 ml unresolved)',
  dose: 'Dose and tank coverage pending validation',
} as const

/** Intended focus areas — not independently validated performance claims. */
export const benefits = [
  {
    title: 'Fuel-system care',
    body: 'Concept focus: supporting a cleaner petrol fuel path. Efficacy is not independently validated.',
  },
  {
    title: 'Drive feel',
    body: 'Concept focus: a smoother fill-up ritual. No verified mpg, horsepower, or emissions claims.',
  },
  {
    title: 'Routine use',
    body: 'Concept focus: a repeatable maintenance habit. Cadence and dose remain pending lab/product approval.',
  },
] as const

export const directions = [
  'Directions are not approved for retail use.',
  'Dose (including any 5 ml / 10 L or “one bottle per tank” ideas) is not validated — do not follow placeholder dosing.',
  'Treat this panel as brand layout only until product and regulatory owners clear final copy.',
] as const

export const storage = [
  'Storage wording is draft only — not retail-cleared SDS guidance.',
  'Measured viscosity, flash point, and filled-bottle compatibility are unverified.',
  'Do not treat this panel as shipping or warehouse instruction.',
] as const

export const warnings = [
  'PETROL ENGINES ONLY — not diesel, aviation, or marine two-stroke.',
  'Hazard classification, CRC/tactile marking, and full hazard labelling are unverified.',
  'SDS draft is lab-only and is not retail clearance.',
  'Design concept — not for production, sale, or on-road use guidance.',
] as const

export const pendingFacts = [
  'Retail fill volume (30 ml vs 50 ml) unresolved',
  'Dose / coverage not validated',
  'Mixture classification pending',
  'Regulatory path not confirmed (Nigeria first; UK deferred)',
] as const
