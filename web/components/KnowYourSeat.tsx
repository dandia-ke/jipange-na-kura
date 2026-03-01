'use client'

import { useEffect } from 'react'
import Link from 'next/link'

type SeatKey = 'president' | 'governor' | 'senator' | 'womenrep' | 'mp' | 'mca'

interface SeatData {
  icon: string
  name: string
  tagline: string
  stats: { val: string; lbl: string }[]
  powers: string[]
  constitution: string
  realTalk: string
}

const KYS_DATA: Record<SeatKey, SeatData> = {
  president: {
    icon: '🇰🇪',
    name: 'President of Kenya',
    tagline: 'Head of State, Head of Government and Commander-in-Chief',
    stats: [{ val: '1', lbl: 'Per Kenya' }, { val: '5 yrs', lbl: 'Term' }, { val: '2', lbl: 'Max Terms' }],
    powers: [
      'Leads the national executive — implements all national laws and policies',
      'Appoints Cabinet Secretaries, the AG, the DPP and all key national offices',
      'Signs or refers Bills passed by Parliament — can reject legislation',
      'Represents Kenya internationally — signs treaties and can declare war',
      'Declares a state of emergency subject to Parliamentary approval',
    ],
    constitution: 'Article 131–155, Constitution of Kenya 2010',
    realTalk: 'The President controls the national budget — over Ksh 3 trillion annually. Who wins this seat determines roads, hospitals, schools and jobs for the next 5 years across all 47 counties.',
  },
  governor: {
    icon: '🏛',
    name: 'County Governor',
    tagline: 'Head of the County Executive — your closest big government',
    stats: [{ val: '47', lbl: 'Governors' }, { val: '5 yrs', lbl: 'Term' }, { val: '2', lbl: 'Max Terms' }],
    powers: [
      'Leads all county government services — health, roads, agriculture, markets',
      'Prepares and implements the county budget (average Ksh 5–15 billion/year)',
      'Appoints County Executive Committee members (county cabinet)',
      'Assents to or returns county legislation passed by the County Assembly',
      'Responsible for county planning — what gets built where in your county',
    ],
    constitution: 'Article 179–182, Constitution of Kenya 2010',
    realTalk: 'The Governor controls the county hospital, the road to your village, the market where you trade, and the bursary your child may apply for. This is the most impactful vote for daily life after the MCA.',
  },
  senator: {
    icon: '🗣',
    name: 'County Senator',
    tagline: "Protects your county's interests in the Senate",
    stats: [{ val: '47', lbl: 'Senators' }, { val: '5 yrs', lbl: 'Term' }, { val: '2', lbl: 'Max Terms' }],
    powers: [
      'Debates and votes on ALL national legislation in the Senate',
      'Must approve Division of Revenue Bill — how national money is split between counties',
      'Can remove a Governor through Senate impeachment proceedings',
      'Represents the county in all matters affecting devolution',
      'Sits on Senate committees overseeing national government spending',
    ],
    constitution: 'Article 96–103, Constitution of Kenya 2010',
    realTalk: "When the national government tries to shortchange counties on revenue share, the Senator is supposed to fight for your county. Most Kenyans do not know who their Senator is — which is exactly why they get away with doing nothing.",
  },
  womenrep: {
    icon: '♀',
    name: 'Women Representative',
    tagline: 'County voice for women, youth and PWDs in the National Assembly',
    stats: [{ val: '47', lbl: 'Women Reps' }, { val: '5 yrs', lbl: 'Term' }, { val: '2', lbl: 'Max Terms' }],
    powers: [
      'Full member of the National Assembly — votes on all national legislation',
      'Champions the interests of women, youth, PWDs and marginalised groups',
      'Sits on Parliamentary committees including Finance, Health and Education',
      'Receives a constituency development fund for projects across the county',
      'Can propose Bills and Private Member Motions in the National Assembly',
    ],
    constitution: 'Article 97(1)(b), Constitution of Kenya 2010',
    realTalk: "The Women Rep has full legislative powers equal to any MP — plus a special mandate for marginalised groups. Many focus on bursaries, sanitary towels in schools, and women's economic projects. The quality of yours determines how much your community benefits.",
  },
  mp: {
    icon: '🗳',
    name: 'Member of Parliament (MP)',
    tagline: "Your constituency's voice in the National Assembly",
    stats: [{ val: '290', lbl: 'MPs' }, { val: '5 yrs', lbl: 'Term' }, { val: 'None', lbl: 'Term Limit' }],
    powers: [
      'Debates and passes all national legislation and the national budget',
      'Oversees and questions national government ministers (Question Time)',
      'Controls National Government Constituencies Development Fund (NG-CDF)',
      'NG-CDF funds bursaries, school buildings, security and local projects',
      'Can initiate impeachment of the President through the National Assembly',
    ],
    constitution: 'Article 97(1)(a), Constitution of Kenya 2010',
    realTalk: 'The NG-CDF is real money — typically Ksh 80–150 million per constituency per year. Your MP controls who gets bursaries, which schools get classrooms, and which roads get murram. This is why MP campaigns are so expensive — the stakes are very high.',
  },
  mca: {
    icon: '🏘',
    name: 'Ward MCA',
    tagline: 'The closest elected official to your daily life',
    stats: [{ val: '1,450', lbl: 'MCAs' }, { val: '5 yrs', lbl: 'Term' }, { val: 'None', lbl: 'Term Limit' }],
    powers: [
      'Passes all county legislation in the County Assembly',
      'Approves the county budget — how the Governor spends county money',
      'Can remove the Governor through a County Assembly impeachment vote',
      'Receives Ward Development Fund for projects within your specific ward',
      'Handles resident petitions directly to the county government',
    ],
    constitution: 'Article 177–178, Constitution of Kenya 2010',
    realTalk: 'The MCA is the most accessible elected official — you can knock on their door. The Ward Development Fund brings footbridges, water tanks and dispensary equipment. Yet MCA elections have the lowest voter turnout. Your ward MCA matters more than most people realise.',
  },
}

const SEAT_TABS: { key: SeatKey; label: string }[] = [
  { key: 'president', label: 'President' },
  { key: 'governor',  label: 'Governor'  },
  { key: 'senator',   label: 'Senator'   },
  { key: 'womenrep',  label: 'Women Rep' },
  { key: 'mp',        label: 'MP'        },
  { key: 'mca',       label: 'MCA'       },
]

interface Props {
  open: boolean
  activeSeat: SeatKey
  onClose: () => void
  onSeatChange: (seat: SeatKey) => void
}

export default function KnowYourSeat({ open, activeSeat, onClose, onSeatChange }: Props) {
  const data = KYS_DATA[activeSeat]

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 680, maxHeight: '90vh',
        overflowY: 'auto', paddingBottom: 40,
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #e2ddd6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '1.3rem' }}>
            🎓 Know Your Seat
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '1.4rem',
              cursor: 'pointer', color: '#6b7280', padding: '4px 8px',
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, padding: '16px 24px 0', overflowX: 'auto',
          borderBottom: '2px solid #e2ddd6', scrollbarWidth: 'none',
        }}>
          {SEAT_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSeatChange(key)}
              style={{
                padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 600,
                color: activeSeat === key ? '#1a6b3c' : '#6b7280',
                borderBottom: activeSeat === key ? '3px solid #1a6b3c' : '3px solid transparent',
                marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Seat hero */}
          <div style={{
            background: '#0a0a0a', borderRadius: 12, padding: '20px 24px',
            marginBottom: 20, color: 'white',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{data.icon}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 900 }}>{data.name}</div>
            <div style={{ fontSize: '0.84rem', color: '#9ca3af', marginTop: 4 }}>{data.tagline}</div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {data.stats.map((s, i) => (
              <div key={i} style={{
                background: '#f9fafb', borderRadius: 10, padding: 12,
                textAlign: 'center', border: '1px solid #e2ddd6',
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a6b3c' }}>{s.val}</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Powers */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: '16px 0 8px' }}>
            What they have power to do
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.powers.map((p, i) => (
              <li key={i} style={{
                padding: '8px 0', borderBottom: i < data.powers.length - 1 ? '1px solid #f3f4f6' : 'none',
                fontSize: '0.85rem', display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ color: '#1a6b3c', fontWeight: 700, flexShrink: 0 }}>→</span>
                {p}
              </li>
            ))}
          </ul>

          {/* Real talk */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: '16px 0 8px' }}>
            Why this seat matters — plain talk
          </div>
          <div style={{
            fontSize: '0.86rem', lineHeight: 1.7, color: '#374151',
            background: '#fffdf5', borderRadius: 8, padding: 14,
            borderLeft: '3px solid #d4a017',
          }}>
            {data.realTalk}
          </div>

          {/* Constitutional reference */}
          <div style={{
            background: '#f0faf4', borderRadius: 8, padding: '10px 14px',
            fontSize: '0.78rem', color: '#374151', borderLeft: '3px solid #1a6b3c',
            marginTop: 16,
          }}>
            ⚖️ {data.constitution}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link
              href="/planner"
              onClick={onClose}
              style={{
                display: 'inline-block', background: '#1a6b3c', color: 'white',
                border: 'none', borderRadius: 8, padding: '12px 28px',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none',
              }}
            >
              Plan My Ballot — All 6 Seats →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { SeatKey }
