'use client'

import Link from 'next/link'
import NavBar from '@/components/NavBar'
import KnowYourSeat, { type SeatKey } from '@/components/KnowYourSeat'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/LangContext'

export default function HomePage() {
  const { t } = useLang()
  const [count, setCount] = useState<string | null>(null)
  const [kysOpen, setKysOpen] = useState(false)
  const [kysSeat, setKysSeat] = useState<SeatKey>('president')

  const SEATS: { label: string; key: SeatKey }[] = [
    { label: t('President', 'Rais'),       key: 'president' },
    { label: t('Governor',  'Gavana'),     key: 'governor'  },
    { label: t('Senator',   'Seneta'),     key: 'senator'   },
    { label: t('Women Rep', 'Mwakilishi wa Wanawake'), key: 'womenrep' },
    { label: t('MP',        'Mbunge'),     key: 'mp'        },
    { label: 'MCA',                        key: 'mca'       },
  ]

  useEffect(() => {
    fetch('https://api.countapi.xyz/hit/jipangenakura.co.ke/visitors')
      .then(r => r.json())
      .then(d => setCount((d.value || 0).toLocaleString('en-KE')))
      .catch(() => {})
  }, [])

  return (
    <main className="hero-main" style={{
      background: '#0a0a0a', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflowX: 'hidden',
    }}>
      <NavBar />

      {/* Diagonal dot pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(45deg, #1a6b3c 0, #1a6b3c 1px, transparent 0, transparent 50%)',
        backgroundSize: '20px 20px',
      }} />

      {/* Kenya stripe bar below nav */}
      <div style={{
        position: 'absolute', top: 72, left: 0, right: 0, height: 5,
        background: 'linear-gradient(to right, #0a0a0a 33%, #c0392b 33%, #c0392b 66%, #1a6b3c 66%)',
      }} />

      <div className="hero-content" style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 680, padding: '60px 32px' }}>

        {/* Visitor counter */}
        {count && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 30, padding: '6px 14px', marginBottom: 16,
            fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
              boxShadow: '0 0 6px #4ade80', animation: 'pulseDot 2s infinite',
            }} />
            <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 800 }}>{count}</span>
            <span>{t('Kenyans planning their vote', 'Wakenya wanaopanga kura yao')}</span>
          </div>
        )}

        {/* Hero badge */}
        <div style={{
          display: 'inline-block', background: '#1a6b3c', color: 'white',
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase',
          padding: '5px 14px', borderRadius: 20, marginBottom: 28,
        }}>
          🇰🇪 {t('Jipange Na Kura — Kenya 2027 Elections', 'Jipange Na Kura — Uchaguzi Kenya 2027')}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: 16,
        }}>
          {t('Know Your', 'Jua')}<br />
          <em style={{ color: '#d4a017', fontStyle: 'normal' }}>{t('Leaders.', 'Viongozi Wako.')}</em><br />
          {t('Shape Your Vote.', 'Panga Kura Yako.')}
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: '1.1rem', color: '#9ca3af', lineHeight: 1.7, marginBottom: 44, fontWeight: 300 }}>
          {t("You elect 6 leaders in every election. Most Kenyans don't know all 6.", "Unapiga kura kwa viongozi 6 kila uchaguzi. Wakenya wengi hawajui wote 6.")}<br />
          {t('Find yours, understand what they do, and plan your 2027 ballot.', 'Wapate wako, elewa wanachofanya, na panga kura yako ya 2027.')}
        </p>

        {/* Dual CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
          <Link href="/planner" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#1a6b3c', color: 'white', fontFamily: "'DM Sans', sans-serif",
            fontSize: '1rem', fontWeight: 600, borderRadius: 6, padding: '16px 36px',
            textDecoration: 'none', letterSpacing: '0.3px',
          }}>
            📍 {t('Plan My 2027 Ballot →', 'Panga Kura Yangu ya 2027 →')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('or', 'au')}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <Link href="/leaders" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif", background: 'transparent',
            border: '2px solid rgba(255,255,255,0.35)', color: 'white', textDecoration: 'none',
          }}>
            <div style={{ textAlign: 'left' }}>
              <div>{t('Browse Current Leaders →', 'Angalia Viongozi wa Sasa →')}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.65, marginTop: 1 }}>
                {t('No location needed — see all 431 current officeholders', 'Hakuna mahali kinachohitajika — tazama viongozi 431 wa sasa')}
              </div>
            </div>
          </Link>
        </div>

        {/* Know Your Seat */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)',
            textAlign: 'center', marginBottom: 10,
          }}>
            🎓 {t('What does each seat do?', 'Kila kiti hufanya nini?')}
          </div>
          <div className="hero-seat-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            maxWidth: 520, margin: '0 auto',
          }}>
            {SEATS.map(({ label, key }) => (
              <div
                key={key}
                onClick={() => { setKysSeat(key); setKysOpen(true) }}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '10px 10px 8px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#9ca3af', lineHeight: 1.3,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp community */}
        <a
          href="https://wa.me/254700000000?text=Niongeze%20kwenye%20Jipange%20Na%20Kura%20Community"
          target="_blank" rel="noopener"
          style={{
            marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
            borderRadius: 24, padding: '8px 18px', textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#25d366' }}>{t('Join our WhatsApp Community', 'Jiunge na Jamii yetu ya WhatsApp')}</div>
            <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{t('Get election updates & reminders', 'Pata habari na vikumbusho vya uchaguzi')}</div>
          </div>
        </a>

        {/* Steps preview */}
        <div className="hero-steps" style={{ marginTop: 28, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            t('Detect Location', 'Gundua Mahali'),
            t('See Your 6 Seats', 'Ona Viti Vyako 6'),
            t('Choose Candidates', 'Chagua Wagombea'),
            t('Share Your Plan', 'Shiriki Mpango Wako'),
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: '0.85rem' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
              }}>{i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

      </div>

      <KnowYourSeat
        open={kysOpen}
        activeSeat={kysSeat}
        onClose={() => setKysOpen(false)}
        onSeatChange={(s) => setKysSeat(s)}
      />
    </main>
  )
}
