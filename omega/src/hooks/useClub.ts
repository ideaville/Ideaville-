import { useEffect, useState } from 'react'
import type { RankId } from '../data/network'
import { applyReferral, isRankId, makeCode, sanitizeDisplayName } from './clubLogic'

export type ClubMember = {
  name: string
  code: string
  rank: RankId
  referrals: number
  volume: number
  demoPoints: number
}

const STORAGE_KEY = 'omega-executive-club'
const SCHEMA_VERSION = 2

type StoredPayload = {
  v: number
  member: ClubMember
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseMember(raw: unknown): ClubMember | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (typeof value.name !== 'string' || typeof value.code !== 'string') return null
  if (!isRankId(value.rank)) return null
  if (!isFiniteNumber(value.referrals) || !isFiniteNumber(value.volume)) return null
  const demoPoints = isFiniteNumber(value.demoPoints)
    ? value.demoPoints
    : isFiniteNumber(value.earnings)
      ? value.earnings
      : null
  if (demoPoints === null) return null
  return {
    name: sanitizeDisplayName(value.name) || 'Demo driver',
    code: value.code.slice(0, 24),
    rank: value.rank,
    referrals: Math.floor(value.referrals),
    volume: Math.floor(value.volume),
    demoPoints: Number(demoPoints.toFixed(2)),
  }
}

function readMember(): ClubMember | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'v' in parsed && 'member' in parsed) {
      const payload = parsed as StoredPayload
      if (payload.v !== SCHEMA_VERSION) return null
      return parseMember(payload.member)
    }
    // Legacy v1 shape (earnings field) — accept once, then rewrite as v2.
    return parseMember(parsed)
  } catch {
    return null
  }
}

function writeMember(member: ClubMember | null) {
  if (!member) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  const payload: StoredPayload = { v: SCHEMA_VERSION, member }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function useClub() {
  const [member, setMember] = useState<ClubMember | null>(() => readMember())

  useEffect(() => {
    writeMember(member)
  }, [member])

  function join(name: string) {
    const safe = sanitizeDisplayName(name)
    if (!safe) return null
    const next: ClubMember = {
      name: safe,
      code: makeCode(safe),
      rank: 'member',
      referrals: 0,
      volume: 0,
      demoPoints: 0,
    }
    setMember(next)
    return next
  }

  function addReferral(saleValue = 48) {
    setMember((current) => {
      if (!current) return current
      return { ...current, ...applyReferral(current, saleValue) }
    })
  }

  function reset() {
    setMember(null)
  }

  return { member, join, addReferral, reset }
}
