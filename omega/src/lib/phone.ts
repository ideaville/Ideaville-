/**
 * Accepts international-format numbers for Nigeria and similar markets:
 * +234…, leading 0 local form, and spaced/dashed groups.
 * Not a rigid 11-digit national rule.
 */
export function isPlausiblePhone(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  const digits = trimmed.replace(/[^\d]/g, '')
  if (trimmed.startsWith('+')) {
    return digits.length >= 10 && digits.length <= 15
  }
  return digits.length >= 10 && digits.length <= 14
}

export function normalizePhoneDisplay(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
