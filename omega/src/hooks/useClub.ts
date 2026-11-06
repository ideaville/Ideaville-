import { useEffect, useState } from 'react'
import type { RankId } from '../data/network'
import { applyReferral, makeCode } from './clubLogic'

export type ClubMember = {
  name: string
  code: string
  rank: RankId
  referrals: number
  volume: number
  earnings: number
}

const STORAGE_KEY = 'omega-executive-club'

function readMember(): ClubMember | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ClubMember
  } catch {
    return null
  }
}

function writeMember(member: ClubMember | null) {
  if (!member) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(member))
}

export function useClub() {
  const [member, setMember] = useState<ClubMember | null>(() => readMember())

  useEffect(() => {
    writeMember(member)
  }, [member])

  function join(name: string) {
    const next: ClubMember = {
      name: name.trim() || 'Driver',
      code: makeCode(name || 'DRIVER'),
      rank: 'advocate',
      referrals: 0,
      volume: 0,
      earnings: 0,
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
