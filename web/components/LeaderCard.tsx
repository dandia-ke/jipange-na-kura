'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { Leader } from '@/lib/supabase'

const ROLE_BADGE: Record<string, string> = {
  governor: '🏛 GOVERNOR',
  senator:  '🏛 SENATOR',
  womenrep: '♀ WOMEN REP',
}

type Props = {
  leader: Leader
  roleDesc?: string
  onClick?: () => void
}

export default function LeaderCard({ leader, roleDesc, onClick }: Props) {
  const [imgError, setImgError] = useState(false)

  const photoSrc =
    leader.photo_url && !imgError
      ? leader.photo_url.startsWith('http')
        ? leader.photo_url
        : `/${leader.photo_url}`
      : null

  const initials = leader.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div onClick={onClick} className="bg-white rounded-[14px] overflow-hidden border-[1.5px] border-[#e2ddd6] transition-all duration-[150ms] cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 flex flex-col">

      {/* Photo */}
      <div className="relative h-[200px] flex items-center justify-center bg-[#f3f0eb] overflow-hidden">
        {photoSrc ? (
          <Image
            src={photoSrc}
            alt={leader.name}
            fill
            sizes="400px"
            className="object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-5xl font-bold text-[#9ca3af] select-none">
            {initials}
          </span>
        )}

        {/* Role badge */}
        <span className="absolute top-2.5 left-2.5 bg-[#0a0a0a] text-white text-[0.65rem] font-bold px-2.5 py-1 rounded-full tracking-wide z-10">
          {ROLE_BADGE[leader.seat_type] ?? leader.seat_type.toUpperCase()}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4 flex flex-col flex-1">
        <p className="font-bold text-[1rem] leading-snug mb-1 text-[#0a0a0a]">
          {leader.name}
        </p>
        <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#1d9bf0] mb-1.5">
          ✓ IEBC 2022
        </span>
        <p className="text-[0.78rem] text-[#6b7280] mb-3">
          {leader.party}
        </p>

        {roleDesc && (
          <div className="text-[0.75rem] text-[#374151] leading-relaxed bg-[#f9fafb] rounded-lg px-2.5 py-2 border-l-[3px] border-[#1a6b3c] mb-3">
            {roleDesc}
          </div>
        )}

        {/* Contacts */}
        <div className="mt-auto pt-2.5 border-t border-[#e2ddd6] flex flex-wrap gap-1.5">
          {leader.twitter ? (
            <a
              href={`https://x.com/${leader.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.68rem] font-semibold bg-[#f0faf4] text-[#1a6b3c] border border-[#b6dfc4] hover:opacity-80 transition-opacity"
            >
              𝕏 @{leader.twitter}
            </a>
          ) : (
            <span className="text-[0.68rem] text-[#9ca3af]">No verified contacts yet</span>
          )}
        </div>
      </div>
    </div>
  )
}
