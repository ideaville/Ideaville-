/** "6,500" or "6500.50" naira → integer kobo; null if not a valid non-negative amount (max 2 decimals). */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[,\s₦]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}
