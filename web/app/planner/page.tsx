'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { COUNTIES, COUNTY_CONSTITUENCIES, CONSTITUENCY_WARDS } from '@/lib/counties'
import { CONSTITUENCY_DEFAULT_WARD } from '@/lib/constituencyDefaults'
import { fetchPollingStations, type PollingStation } from '@/lib/pollingStations'
import type { KenyaMapHandle } from '@/components/KenyaMap'
import { useLang } from '@/lib/LangContext'

// Dynamic import — Leaflet cannot run on the server
const KenyaMap = dynamic(() => import('@/components/KenyaMap'), { ssr: false })

// ── Official IEBC ballot paper colours ──
const BC: Record<string, { bg: string; label: string; form: string }> = {
  mca:       { bg: '#a0522d', label: 'Beige Ballot',  form: 'Form 25' },
  mp:        { bg: '#2e7d32', label: 'Green Ballot',  form: 'Form 26' },
  women_rep: { bg: '#7b1fa2', label: 'Purple Ballot', form: 'Form 27' },
  senator:   { bg: '#c8920a', label: 'Yellow Ballot', form: 'Form 28' },
  governor:  { bg: '#1565c0', label: 'Blue Ballot',   form: 'Form 29' },
  president: { bg: '#9e9e9e', label: 'White Ballot',  form: 'Form 30' },
}

const SEATS = [
  { key: 'mca',       label: 'Ward MCA',            title: 'Choose your Ward Rep (MCA)',       desc: 'The Member of County Assembly (MCA) represents your ward in the county assembly — the closest elected representative to your daily life.' },
  { key: 'mp',        label: 'National Assembly MP', title: 'Choose your Member of Parliament', desc: 'Your constituency MP represents you in the National Assembly, making laws and overseeing national policy.' },
  { key: 'women_rep', label: 'Women Representative', title: 'Choose your Women Rep',            desc: 'The Women Representative is elected from your county to the National Assembly to champion women and special interest groups.' },
  { key: 'senator',   label: 'County Senator',       title: 'Choose your Senator',              desc: 'Senators represent counties in the Senate, oversee devolution funds, and legislate on matters affecting counties.' },
  { key: 'governor',  label: 'County Governor',      title: 'Choose your Governor',             desc: 'The Governor heads your county government and manages devolved functions including health, agriculture, and local infrastructure.' },
  { key: 'president', label: 'Presidential',         title: 'Choose your President',            desc: 'The President leads the executive branch and serves a 5-year term. Every registered Kenyan votes for the same presidential candidates.' },
]

type SeatKey   = 'mca' | 'mp' | 'women_rep' | 'senator' | 'governor' | 'president'
type Step      = 'location' | 'seats' | 'summary'
type LocTab    = 'gps' | 'manual' | 'iebc'
type GpsStatus = 'idle' | 'detecting' | 'found' | 'error'

interface Candidate {
  name: string; party: string; number: number; age: string
  photo_url?: string | null; emoji?: string; bg?: string
  manifesto?: string[]; prev_seats?: string; twitter?: string; facebook?: string; verified?: boolean
}

const PRESIDENTIAL: Candidate[] = [
  { name: 'William Samoei Ruto', party: 'UDA / Kenya Kwanza', number: 1, age: '57', emoji: '👨🏾‍💼', bg: '#fffbeb' },
  { name: 'Raila Amolo Odinga', party: 'ODM / Azimio',        number: 2, age: '79', emoji: '👨🏾‍💼', bg: '#fff0f0' },
  { name: 'George Wajackoyah',  party: 'Roots Party',         number: 3, age: '63', emoji: '👨🏾‍💼', bg: '#f0fdf4' },
  { name: 'David Mwaure',       party: 'Agano Party',         number: 4, age: '57', emoji: '👨🏾‍💼', bg: '#f5f3ff' },
]

// Placeholder candidates shown when real data is not yet available
const PLACEHOLDER_CANDIDATES: Candidate[] = [
  { name: 'Candidate 1', party: 'UDA',     number: 1, age: '—', emoji: '👤', bg: '#fffbeb' },
  { name: 'Candidate 2', party: 'ODM',     number: 2, age: '—', emoji: '👤', bg: '#eff6ff' },
  { name: 'Candidate 3', party: 'Jubilee', number: 3, age: '—', emoji: '👤', bg: '#fef2f2' },
  { name: 'Candidate 4', party: 'Wiper',   number: 4, age: '—', emoji: '👤', bg: '#f0fdf4' },
]

// ── FPL pitch colours per party ──
const PARTY_JERSEY: Record<string, { bg: string; color: string }> = {
  'UDA':         { bg: 'linear-gradient(160deg,#f59e0b 40%,#78350f)', color: '#000' },
  'ODM':         { bg: 'linear-gradient(160deg,#f97316 40%,#7c2d12)', color: '#fff' },
  'JP':          { bg: 'linear-gradient(160deg,#ef4444 40%,#7f1d1d)', color: '#fff' },
  'WDM-K':       { bg: 'linear-gradient(160deg,#fb923c 40%,#9a3412)', color: '#fff' },
  'DAP-K':       { bg: 'linear-gradient(160deg,#3b82f6 40%,#1e3a8a)', color: '#fff' },
  'FORD-K':      { bg: 'linear-gradient(160deg,#10b981 40%,#064e3b)', color: '#fff' },
  'KANU':        { bg: 'linear-gradient(160deg,#dc2626 40%,#450a0a)', color: '#fff' },
  'CCM':         { bg: 'linear-gradient(160deg,#0891b2 40%,#0c4a6e)', color: '#fff' },
  'Jubilee':     { bg: 'linear-gradient(160deg,#7c3aed 40%,#2e1065)', color: '#fff' },
  'Independent': { bg: 'linear-gradient(160deg,#6b7280 40%,#111827)', color: '#fff' },
}
const DEFAULT_JERSEY = { bg: 'linear-gradient(160deg,#37003c 40%,#0f0020)', color: '#fff' }

function FplOverlay({ selections, county, constit, onClose, t }: {
  selections: Record<string, Candidate | null>
  county: string; constit: string
  onClose: () => void
  t: (en: string, sw: string) => string
}) {
  const pitchRef = useRef<HTMLDivElement>(null)

  async function saveImage() {
    if (!pitchRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(pitchRef.current, { useCORS: true, scale: 2, backgroundColor: null })
      const link = document.createElement('a')
      link.download = 'my-ballot-squad.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { /* silent fail — user can screenshot */ }
  }

  const rows = [
    { seats: [{ key: 'president',  label: 'President' }] },
    { seats: [{ key: 'governor', label: 'Governor' }, { key: 'senator', label: 'Senator' }, { key: 'women_rep', label: 'Women Rep' }] },
    { seats: [{ key: 'mp',       label: 'MP' }] },
    { seats: [{ key: 'mca',      label: 'MCA' }] },
  ]

  const filled = Object.values(selections).filter(Boolean).length
  const loc = [constit, county].filter(Boolean).join(' · ')

  function PlayerCard({ seatKey, label }: { seatKey: string; label: string }) {
    const cand = selections[seatKey]
    const jersey = cand ? (PARTY_JERSEY[cand.party] ?? DEFAULT_JERSEY) : DEFAULT_JERSEY
    const surname = cand ? cand.name.split(' ').slice(-1)[0] : ''
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72 }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', background: cand ? jersey.bg : 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: cand ? '1.4rem' : '1.2rem', border: '2px solid rgba(255,255,255,0.3)',
          transition: 'transform 0.15s', position: 'relative', flexShrink: 0,
        }}>
          {cand?.photo_url
            ? <img src={cand.photo_url.startsWith('http') ? cand.photo_url : `/${cand.photo_url}`} alt={cand.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <span>{cand ? (cand.emoji || '👤') : '❓'}</span>
          }
          {seatKey === 'president' && cand && (
            <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#d4a017', color: '#000', fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</div>
          )}
        </div>
        <div style={{ color: 'white', fontSize: '0.6rem', fontWeight: 700, textAlign: 'center', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>
          {cand ? surname : t('No Pick', 'Hakuna')}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.52rem', textAlign: 'center' }}>{label}</div>
        {cand && (
          <div style={{ fontSize: '0.48rem', fontWeight: 700, color: 'white', background: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: '1px 5px', marginTop: 2, maxWidth: 68, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cand.party}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Pitch */}
        <div ref={pitchRef} style={{
          position: 'relative', background: 'linear-gradient(180deg,#1a5c2a 0%,#1e7a30 40%,#1a5c2a 100%)',
          borderRadius: 16, overflow: 'hidden', padding: '24px 16px 16px',
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          {/* Pitch markings */}
          <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: 1, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ position: 'absolute', top: '12%', left: '25%', right: '25%', bottom: '12%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }} />

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ color: 'white', fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '1.1rem', letterSpacing: 1 }}>
              🇰🇪 {t('My Ballot Squad', 'Timu Yangu ya Kura')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem', marginTop: 2 }}>
              {loc}{loc ? ' — ' : ''}{filled}/6 {t('picked', 'waliochaguliwa')}
            </div>
          </div>

          {/* Formation rows */}
          {rows.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: ri < rows.length - 1 ? 20 : 8 }}>
              {row.seats.map(s => <PlayerCard key={s.key} seatKey={s.key} label={s.label} />)}
            </div>
          ))}

          {/* Formation label */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>1-3-1-1</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          <button onClick={saveImage} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 22px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            📸 {t('Save Image', 'Hifadhi Picha')}
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 22px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            ✕ {t('Close', 'Funga')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlannerPage() {
  const { t } = useLang()
  const [step, setStep]       = useState<Step>('location')
  const [locTab, setLocTab]   = useState<LocTab>('manual') // default to manual entry
  const [county, setCounty]   = useState('')
  const [constit, setConstit] = useState('')
  const [ward, setWard]       = useState('')
  const [seatIdx, setSeatIdx] = useState(0)
  const [selections, setSelections] = useState<Record<SeatKey, Candidate | null>>({
    mca: null, mp: null, women_rep: null, senator: null, governor: null, president: null,
  })
  const [profileCand, setProfileCand]   = useState<Candidate | null>(null)

  // lock body scrolling when profile/other full‑screen panels are open
  useEffect(() => {
    document.body.style.overflow = profileCand ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [profileCand])
  const [toast, setToast]               = useState('')
  const [gpsStatus, setGpsStatus]       = useState<GpsStatus>('idle')
  const [gpsError, setGpsError]         = useState('')
  const [showFpl, setShowFpl]           = useState(false)
  const [pollingOpen, setPollingOpen]         = useState(false)
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([])
  const [pollingLoading, setPollingLoading]   = useState(false)
  const [highlightNext, setHighlightNext]     = useState(false)

  const navRef = useRef<HTMLDivElement>(null)

  const mapRef         = useRef<KenyaMapHandle>(null)
  const pollingListRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const constituencies = county ? (COUNTY_CONSTITUENCIES[county] ?? []) : []
  const wards = constit ? (CONSTITUENCY_WARDS[constit] ?? []) : []

  // Fetch real polling stations from IEBC CSV when ward is selected
  useEffect(() => {
    if (!ward || !county) { setPollingStations([]); return }
    setPollingLoading(true)
    fetchPollingStations(county, ward)
      .then(setPollingStations)
      .finally(() => setPollingLoading(false))

    // scroll window down to the confirm button when ward is chosen
    setTimeout(() => {
      const el = confirmRef.current
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)
  }, [ward, county])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function requestGPS() {
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsError(t('GPS not supported by your browser.', 'GPS haifanyi kazi kwenye kivinjari chako.')); return }
    setGpsStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const found = mapRef.current?.findByCoords(lat, lng)
        if (found) {
          const defaultWard = CONSTITUENCY_DEFAULT_WARD[found.constituency] ?? ''
          setCounty(found.county)
          setConstit(found.constituency)
          setWard(defaultWard)
          setGpsStatus('found')
          mapRef.current?.flyTo(lat, lng)
          flash(`📍 ${found.constituency}, ${found.county}`)
        } else {
          setGpsStatus('error')
          setGpsError(t('Could not match your GPS position to a constituency. Please use manual entry.', 'Mahali ulipo halikupatikana. Tafadhali ingiza mwenyewe.'))
        }
      },
      err => {
        setGpsStatus('error')
        setGpsError(err.code === 1
          ? t('Location access denied. Please allow GPS or use manual entry.', 'Ufikiaji wa mahali ulikataliwa. Ruhusu GPS au ingiza mwenyewe.')
          : t('Could not get your location. Please use manual entry.', 'Mahali yako hayakupatikana. Tafadhali ingiza mwenyewe.'))
      },
      { timeout: 12000, enableHighAccuracy: true }
    )
  }

  function confirmLocation() {
    if (!county || !constit || !ward) { flash(t('Please select your county, constituency and ward', 'Tafadhali chagua kaunti, jimbo na kata yako')); return }
    setSeatIdx(0)
    setSelections({ mca: null, mp: null, women_rep: null, senator: null, governor: null, president: null })
    setStep('seats')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getCandidates(key: SeatKey): Candidate[] {
    if (key === 'president') return PRESIDENTIAL
    return PLACEHOLDER_CANDIDATES
  }

  function select(key: SeatKey, cand: Candidate) {
    setSelections(prev => ({ ...prev, [key]: cand }))
    flash(`✓ ${t('Selected', 'Umechagua')}: ${cand.name}`)

    // scroll to nav and briefly highlight Next button
    setTimeout(() => {
      if (navRef.current) {
        navRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setHighlightNext(true)
      setTimeout(() => setHighlightNext(false), 2400) // keep highlight longer
    }, 200) // delay scroll a bit more
  }

  function nextSeat() {
    if (!selections[SEATS[seatIdx].key as SeatKey]) {
      flash(t('Please select a candidate to continue', 'Tafadhali chagua mgombea kuendelea')); return
    }
    advance()
  }

  function advance() {
    const next = seatIdx + 1
    if (next >= SEATS.length) { setStep('summary') } else { setSeatIdx(next) }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prevSeat() {
    if (seatIdx > 0) { setSeatIdx(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  function restart() {
    setStep('location'); setCounty(''); setConstit(''); setWard('')
    setSeatIdx(0); setGpsStatus('idle'); setGpsError('')
    setPollingOpen(false); setSelectedStation(''); setPollingStations([])
    setSelections({ mca: null, mp: null, women_rep: null, senator: null, governor: null, president: null })
  }

  const seat = SEATS[seatIdx]
  const bc   = BC[seat?.key ?? 'governor']
  const pct  = Math.round((seatIdx / SEATS.length) * 100)

  const seatTag = (() => {
    if (seat?.key === 'mca'       && ward)    return `${ward} MCA`
    if (seat?.key === 'mp'        && constit) return `${constit} MP`
    if (seat?.key === 'senator'   && county)  return `${county} Senator`
    if (seat?.key === 'governor'  && county)  return `${county} Governor`
    if (seat?.key === 'women_rep' && county)  return `${county} Women Rep`
    if (seat?.key === 'president')            return 'Presidential'
    return seat?.label ?? ''
  })()

  const seatTitle = (() => {
    if (seat?.key === 'mca'       && ward)    return `Choose your ${ward} MCA`
    if (seat?.key === 'mp'        && constit) return `Choose your ${constit} MP`
    if (seat?.key === 'senator'   && county)  return `Choose your ${county} Senator`
    if (seat?.key === 'governor'  && county)  return `Choose your ${county} Governor`
    if (seat?.key === 'women_rep' && county)  return `Choose your ${county} Women Representative`
    return seat?.title ?? ''
  })()

  const candidates = seat ? getCandidates(seat.key as SeatKey) : []
  const isPlaceholder = candidates === PLACEHOLDER_CANDIDATES

  const tabStyle = (active: boolean) => ({
    flex: 1, padding: '11px 8px', borderRadius: 8, cursor: 'pointer' as const,
    border: `2px solid ${active ? '#1a6b3c' : '#e2ddd6'}`,
    background: active ? '#f0faf4' : 'white',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600,
    textAlign: 'center' as const, color: active ? '#1a6b3c' : '#6b7280',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  })

  // ── Polling stations toggle UI ──
  function PollingSection() {
    if (!ward) return null
    return (
      <div style={{ marginTop: 16 }}>
        <div
          onClick={() => { if (!pollingLoading) setPollingOpen(o => !o) }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f3f0eb', border: `1.5px solid ${pollingOpen ? '#d4a017' : '#e2ddd6'}`,
            borderRadius: 10, padding: '13px 18px', cursor: pollingLoading ? 'default' : 'pointer',
            marginBottom: pollingOpen ? 8 : 0, transition: 'all 0.18s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>🏫</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700 }}>{t('Polling Stations Near You', 'Vituo vya Kupigia Kura Karibu Nawe')}</strong>
              <span style={{ fontSize: '0.76rem', color: '#6b7280' }}>
                {pollingLoading
                  ? t('Loading stations…', 'Inapakia vituo…')
                  : t(`${pollingStations.length} stations in ${ward} ward`, `Vituo ${pollingStations.length} katika kata ya ${ward}`)}
              </span>
            </div>
          </div>
          {pollingLoading
            ? <div style={{ width: 16, height: 16, border: '2px solid #e2ddd6', borderTopColor: '#1a6b3c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <span style={{ color: '#6b7280', transition: 'transform 0.2s', display: 'inline-block', transform: pollingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          }
        </div>
        {pollingOpen && (
          <div ref={pollingListRef} style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 8 }}>
            {pollingStations.map((s, i) => (
              <div
                key={i}
                onClick={() => {
                  const top = pollingListRef.current?.scrollTop ?? 0
                  setSelectedStation(s.name === selectedStation ? '' : s.name)
                  requestAnimationFrame(() => {
                    if (pollingListRef.current) pollingListRef.current.scrollTop = top
                  })
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${selectedStation === s.name ? '#1a6b3c' : '#e2ddd6'}`,
                  background: selectedStation === s.name ? '#fffdf5' : 'white',
                  marginBottom: 8, transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: selectedStation === s.name ? '#1a6b3c' : '#d4a017', color: selectedStation === s.name ? 'white' : '#0a0a0a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, marginTop: 1 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: 2 }}>📍 {s.address}</div>
                  <div style={{ fontSize: '0.72rem', color: '#1a6b3c', marginTop: 2 }}>
                    🗳️ {s.streams} {t(`stream${s.streams !== 1 ? 's' : ''}`, `mkondo${s.streams !== 1 ? '' : ''}`)} · {ward}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${ward}, ${constit}, Kenya`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: '0.73rem', color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
                    View on Google Maps
                  </a>
                </div>
                {selectedStation === s.name && (
                  <span style={{ color: '#1a6b3c', fontWeight: 700, flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>✓ {t('Selected', 'Imechaguliwa')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#faf7f2' }}>
      {/* Minimal nav — logo only on planner */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        background: '#0a0a0a', borderBottom: '3px solid #1a6b3c', minHeight: 52,
      }}>
        <Link href="/" style={{
          fontFamily: "'Playfair Display', serif", fontSize: '1.25rem',
          fontWeight: 900, color: 'white', letterSpacing: '-0.5px',
          whiteSpace: 'nowrap', textDecoration: 'none',
        }}>
          Jipange Na <span style={{ color: '#d4a017' }}>Kura</span>
        </Link>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: 'white', padding: '12px 24px', borderRadius: 30, fontSize: '0.85rem', fontWeight: 600, zIndex: 1000, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* ── STEP 1: LOCATION ── */}
      {step === 'location' && (
        <div className="planner-root" style={{ display: 'flex', height: 'calc(100vh - 52px)', marginTop: 52 }}>

          {/* LEFT: Leaflet map — hidden on mobile */}
          <div className="planner-map-col" style={{ background: '#0d1117', position: 'relative' }}>
            <KenyaMap
              ref={mapRef}
              county={county}
              constituency={constit}
              ward={ward}
            />
          </div>

          {/* RIGHT: Form panel — full width on mobile */}
          <div className="planner-form-col" style={{ padding: '40px 36px', background: 'white', borderLeft: '1px solid #e2ddd6' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#1a6b3c', marginBottom: 10 }}>📍 {t('Your Location', 'Mahali Pako')}</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, marginBottom: 10, lineHeight: 1.15 }}>{t('Find your constituency', 'Tafuta jimbo lako')}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 32 }}>{t('Use GPS to auto-detect, or enter your details manually.', 'Tumia GPS kugundua, au ingiza maelezo yako wewe mwenyewe.')}</p>

            {/* Method tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button style={tabStyle(locTab === 'gps')}    onClick={() => setLocTab('gps')}>📡 {t('Detect via GPS', 'Gundua kwa GPS')}</button>
              <button style={tabStyle(locTab === 'manual')} onClick={() => setLocTab('manual')}>✏️ {t('Enter Manually', 'Ingiza Mwenyewe')}</button>
              <button style={tabStyle(locTab === 'iebc')}   onClick={() => setLocTab('iebc')}>🪪 {t('Verify via IEBC', 'Thibitisha kupitia IEBC')}</button>
            </div>

            {/* GPS Panel */}
            {locTab === 'gps' && (
              <div>
                {gpsStatus === 'idle' && (
                  <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>📡</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>{t('Detect my location', 'Gundua mahali nilipo')}</div>
                    <p style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 20 }}>
                      {t('Your browser will ask for permission to access your GPS. Your location is never stored or shared.', 'Kivinjari chako kitaomba ruhusa ya kufikia GPS yako. Mahali ulipo haihifadhiwi wala kushirikiwa.')}
                    </p>
                    <button onClick={requestGPS} style={{ background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 10, padding: '13px 28px', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      📡 {t('Allow Location Access', 'Ruhusu Ufikiaji wa Mahali')}
                    </button>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 12 }}>🔒 {t('Stays in your browser only', 'Hubaki kwenye kivinjari chako tu')}</div>
                  </div>
                )}
                {gpsStatus === 'detecting' && (
                  <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #e2ddd6', borderTopColor: '#1a6b3c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    <div style={{ color: '#6b7280', fontSize: '0.88rem' }}>{t('Fetching your location from GPS…', 'Inatafuta mahali ulipo kwa GPS…')}</div>
                  </div>
                )}
                {gpsStatus === 'found' && (
                  <div>
                    {/* County / Constituency / Ward all in one panel — matches original HTML loc-display */}
                    <div style={{ background: '#f3f0eb', borderRadius: 10, padding: '4px 24px 16px', marginBottom: 16, border: '1px solid #e2ddd6' }}>
                      {/* County row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2ddd6' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>{t('County', 'Kaunti')}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{county || '—'}</span>
                      </div>
                      {/* Constituency row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2ddd6' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>{t('Constituency', 'Jimbo')}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{constit || '—'}</span>
                      </div>
                      {/* Ward row — static text (auto-detected) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>{t('Ward', 'Kata')}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{ward || t('Ward not on record', 'Kata haikupatikana')}</span>
                      </div>
                      <div style={{ color: '#1a6b3c', fontSize: '0.82rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>✅ {t('Location found successfully.', 'Mahali limepatikana.')}</div>
                    </div>

                    {/* Polling stations — shown once ward is selected */}
                    {ward && <PollingSection />}
                  </div>
                )}
                {gpsStatus === 'error' && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.5 }}>⚠️ {gpsError}</div>
                    <button onClick={() => { setGpsStatus('idle'); setGpsError('') }} style={{ marginTop: 10, background: 'none', border: 'none', color: '#1a6b3c', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>{t('Try again', 'Jaribu tena')}</button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Panel */}
            {locTab === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', display: 'block', marginBottom: 5 }}>{t('County', 'Kaunti')}</label>
                  <select value={county} onChange={e => { setCounty(e.target.value); setConstit(''); setWard(''); setPollingOpen(false); setSelectedStation('') }}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e2ddd6', background: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: '#0a0a0a', outline: 'none' }}>
                    <option value="">{t('— Select County —', '— Chagua Kaunti —')}</option>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', display: 'block', marginBottom: 5 }}>{t('Constituency', 'Jimbo')}</label>
                  <select value={constit} onChange={e => { setConstit(e.target.value); setWard(''); setPollingOpen(false); setSelectedStation('') }} disabled={!county}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e2ddd6', background: county ? 'white' : '#f3f0eb', fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: '#0a0a0a', outline: 'none' }}>
                    <option value="">{t('— Select County first —', '— Chagua Kaunti kwanza —')}</option>
                    {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', display: 'block', marginBottom: 5 }}>{t('Ward', 'Kata')}</label>
                  <select value={ward} onChange={e => { setWard(e.target.value); setPollingOpen(false); setSelectedStation('') }} disabled={!constit}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e2ddd6', background: constit ? 'white' : '#f3f0eb', fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: '#0a0a0a', outline: 'none' }}>
                    <option value="">{t('— Select Constituency first —', '— Chagua Jimbo kwanza —')}</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                {/* Polling stations — shown once ward is selected */}
                {ward && <PollingSection />}
              </div>
            )}

            {/* IEBC Panel */}
            {locTab === 'iebc' && (
              <div>
                <div style={{ background: '#f0faf4', border: '1.5px solid #b6e0c8', borderRadius: 10, padding: '13px 15px', marginBottom: 14, display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>🪪</span>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#1a6b3c', lineHeight: 1.55 }}>{t('Verify your voter registration on the official IEBC portal, then enter your ward details manually below.', 'Thibitisha usajili wako wa kupiga kura kwenye tovuti rasmi ya IEBC, kisha ingiza maelezo ya kata yako hapa chini.')}</p>
                </div>
                <div style={{ border: '1.5px solid #e2ddd6', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ background: '#0a0a0a', padding: '14px 18px' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>🇰🇪 {t('IEBC Voter Verification Portal', 'Tovuti ya Uthibitishaji wa IEBC')}</span>
                    <small style={{ color: '#9ca3af', fontSize: '0.72rem', display: 'block', marginTop: 2 }}>verify.iebc.or.ke — {t('official IEBC website', 'tovuti rasmi ya IEBC')}</small>
                  </div>
                  <div style={{ padding: '20px 18px', background: 'white' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {[
                        t('Click the button below — the official IEBC portal opens in a new tab', 'Bonyeza kitufe hapa chini — tovuti rasmi ya IEBC itafunguka kwenye kichupo kipya'),
                        t('Enter your National ID / Passport No. and Year of Birth', 'Ingiza Nambari yako ya Kitambulisho / Pasipoti na Mwaka wa Kuzaliwa'),
                        t('Note your County, Constituency and Ward shown on that page', 'Andika Kaunti, Jimbo na Kata inayoonekana kwenye ukurasa huo'),
                        t('Come back here and enter those details manually below', 'Rudi hapa na uingize maelezo hayo hapa chini'),
                      ].map((txt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a6b3c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                          <span>{txt}</span>
                        </div>
                      ))}
                    </div>
                    <a href="https://verify.iebc.or.ke/" target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1a6b3c', color: 'white', padding: '13px 24px', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none' }}>
                      🔗 {t('Open IEBC Portal', 'Fungua Tovuti ya IEBC')} ↗
                    </a>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 10, textAlign: 'center' }}>🔒 {t("Opens in a new tab — your ID is entered directly on IEBC's secure site", 'Inafunguka kwenye kichupo kipya — Kitambulisho chako kinaingizwa moja kwa moja kwenye tovuti salama ya IEBC')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  <div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />{t('Once you have confirmed your ward', 'Baada ya kuthibitisha kata yako')}<div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />
                </div>
                <button onClick={() => setLocTab('manual')} style={{ width: '100%', padding: 13, borderRadius: 10, cursor: 'pointer', border: '2px solid #1a6b3c', background: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', fontWeight: 600, color: '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  ✏️ {t('Enter My Details Manually →', 'Ingiza Maelezo Yangu Mwenyewe →')}
                </button>
              </div>
            )}

            {/* Confirm button */}
            {county && constit && (
              <div ref={confirmRef} style={{ marginTop: 24 }}>
                <button onClick={confirmLocation} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#1a6b3c', color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 }}>
                  <span>{t('Confirm Location', 'Thibitisha Mahali')}</span>
                  <span style={{ fontSize: '0.8em', opacity: 0.85 }}>&amp; {t('Load Candidates →', 'Pakia Wagombea →')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: SEAT SELECTOR ── */}
      {step === 'seats' && seat && (
        <div style={{ maxWidth: 780, width: '95%', margin: '0 auto', padding: '68px 20px 80px' }}>

          {/* Progress bar */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              <span>{t(`Seat ${seatIdx + 1} of ${SEATS.length}`, `Kiti ${seatIdx + 1} kati ya ${SEATS.length}`)}</span><span>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #1a6b3c, #2d9b5a)', borderRadius: 10, width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Seat header */}
          <div style={{ borderRadius: 14, padding: '20px 22px', marginBottom: 28, background: bc.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.3)', border: '1.5px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.78)' }}>{bc.label} — {bc.form}</span>
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.45)', marginBottom: 12 }}>{seatTag}</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, lineHeight: 1.15, marginBottom: 6, color: '#fff' }}>{seatTitle}</h2>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem' }}>{seat.desc}</p>
          </div>

          {/* Placeholder notice */}
          {isPlaceholder && seat.key !== 'president' && (
            <div style={{ background: '#fffdf5', border: '1px solid #e2ddd6', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: '#7d5a00', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>🗳️</span>
              <span>{t('Verified 2027 candidates for this seat will appear here once officially declared. You may select a placeholder to mark your intention.', 'Wagombea halisi wa 2027 kwa kiti hiki wataonekana hapa wanapotangazwa rasmi. Unaweza kuchagua kiwakilishi kuonyesha nia yako.')}</span>
            </div>
          )}

          {/* Candidates grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            {candidates.map((cand, i) => {
              const isSel    = selections[seat.key as SeatKey]?.name === cand.name
              const photoSrc = cand.photo_url ? (cand.photo_url.startsWith('http') ? cand.photo_url : `/${cand.photo_url}`) : null
              return (
                <div key={i} onClick={() => select(seat.key as SeatKey, cand)}
                  style={{ background: isSel ? '#f0faf4' : 'white', border: `2px solid ${isSel ? '#1a6b3c' : '#e2ddd6'}`, borderRadius: 14, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.18s' }}>
                  {isSel && <div style={{ position: 'absolute', top: 10, right: 10, width: 24, height: 24, background: '#1a6b3c', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', zIndex: 2 }}>✓</div>}
                  <div style={{ height: 140, background: `linear-gradient(135deg, ${cand.bg || '#e8f5e9'} 0%, #f0f0f0 100%)`, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {photoSrc ? <img src={photoSrc} alt={cand.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} /> : <div style={{ fontSize: '3.5rem' }}>{cand.emoji || '👤'}</div>}
                    <div style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{cand.number}</div>
                    <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: 4, padding: '2px 6px', background: bc.bg, color: 'white' }}>{cand.party}</div>
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.3, marginBottom: 2 }}>{cand.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.76rem', marginBottom: 10 }}>Age {cand.age} · {cand.party}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={e => { e.stopPropagation(); select(seat.key as SeatKey, cand) }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: isSel ? '#0d5c30' : '#1a6b3c', color: 'white' }}>
                        {isSel ? `✓ ${t('Selected', 'Umechagua')}` : t('Select', 'Chagua')}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setProfileCand(cand) }}
                        style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: '1.5px solid #e2ddd6', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: '#0a0a0a', whiteSpace: 'nowrap' }}>
                        {t('More Info', 'Maelezo Zaidi')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Nav buttons: Back | Next Seat → */}
          <div ref={navRef} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={prevSeat} style={{ visibility: seatIdx === 0 ? 'hidden' : 'visible', padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e2ddd6', background: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('← Back', '← Rudi')}
            </button>
            <button
              onClick={nextSeat}
              style={{
                padding: '12px 28px', borderRadius: 10, border: 'none', background: '#1a6b3c', color: 'white', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: highlightNext ? '0 0 0 4px rgba(212,160,23,0.6)' : undefined,
                transition: 'box-shadow 0.4s ease'
              }}
            >
              {seatIdx === SEATS.length - 1
                ? t('View My Ballot →', 'Angalia Kura Yangu →')
                : t('Next Seat →', 'Kiti Kinachofuata →')}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: BALLOT SUMMARY ── */}
      {step === 'summary' && (
        <div style={{ maxWidth: 860, width: '95%', margin: '0 auto', padding: '68px 20px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c0392b', marginBottom: 8 }}>🗳️ {t('Your Ballot Plan', 'Mpango Wako wa Kura')}</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 900, marginBottom: 8 }}>{t('Your Personal Ballot Summary', 'Muhtasari Wako wa Kura')}</h2>
            <p style={{ color: '#6b7280', marginTop: 8 }}>{t('Take a screenshot or print this before going to the polling station.', 'Piga picha ya skrini au chapisha hii kabla ya kwenda kituo cha kupiga kura.')}</p>
          </div>

          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '2px solid #0a0a0a' }}>
            <div style={{ background: '#0a0a0a', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>Jipange Na <span style={{ color: '#d4a017' }}>Kura</span></div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{t('Republic of Kenya — Personal Ballot Plan', 'Jamhuri ya Kenya — Mpango wa Kura Binafsi')}</div>
              </div>
              <div style={{ color: '#d4a017', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.3)', padding: '5px 12px', borderRadius: 20 }}>UNOFFICIAL PLANNING AID</div>
            </div>

            <div style={{ background: '#f3f0eb', padding: '14px 32px', display: 'flex', gap: 32, flexWrap: 'wrap', borderBottom: '1px solid #e2ddd6' }}>
              {([[t('County','Kaunti'), county], [t('Constituency','Jimbo'), constit], [t('Ward','Kata'), ward || '—']] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>{k}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              {selectedStation && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>{t('Polling Station', 'Kituo cha Kupiga Kura')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>🏫 {selectedStation}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SEATS.map(s => {
                const cand  = selections[s.key as SeatKey]
                const theme = BC[s.key] || { bg: '#333', label: s.label, form: '' }
                const label = (() => {
                  if (s.key === 'mca'       && ward)    return `${ward} MCA`
                  if (s.key === 'mp'        && constit) return `${constit} MP`
                  if (s.key === 'senator'   && county)  return `${county} Senator`
                  if (s.key === 'governor'  && county)  return `${county} Governor`
                  if (s.key === 'women_rep' && county)  return `${county} Women Rep`
                  if (s.key === 'president')            return 'Presidential'
                  return s.label
                })()
                // add class for president to allow hiding in print
                const wrapperClass = s.key === 'president' ? 'president-seat' : undefined
                return (
                  <div key={s.key} className={wrapperClass} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: `1.5px solid ${theme.bg}55` }}>
                    <div style={{ padding: '10px 16px', background: theme.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(255,255,255,0.3)', border: '1.5px solid rgba(255,255,255,0.5)', flexShrink: 0 }} />
                      <span style={{ color: 'white', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.8px' }}>{label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{theme.label} · {theme.form}</span>
                    </div>
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, background: 'white' }}>
                      <div style={{ width: 28, height: 28, border: `2px solid ${cand ? theme.bg : '#ccc'}`, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cand ? theme.bg : 'transparent', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{cand ? '✓' : ''}</div>
                      {cand ? (
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cand.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{cand.party}</div>
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 900, color: theme.bg }}>{cand.number}</div>
                        </>
                      ) : (
                        <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.85rem' }}>— {t('No selection made for this seat', 'Hakuna chaguo lililofanywa kwa kiti hiki')} —</div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: '14px 16px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082', fontSize: '0.78rem', color: '#7d5a00', lineHeight: 1.6 }}>
                ⚠️ <strong>{t('This is NOT an official ballot paper.', 'Hii SI karatasi rasmi ya kura.')}</strong> {t('Jipange Na Kura is an independent civic planning tool. Always follow official IEBC guidance on Election Day.', 'Jipange Na Kura ni zana huru ya mipango ya kiraia. Fuata miongozo rasmi ya IEBC siku ya uchaguzi.')}
              </div>
            </div>

            <div style={{ background: '#0a0a0a', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>{t('Generated by', 'Imetokana na')} <strong style={{ color: '#d4a017' }}>Jipange Na Kura</strong> — {t('Not an official IEBC document', 'Si hati rasmi ya IEBC')}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>{new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{ background: '#0a0a0a', color: 'white', padding: '14px 28px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>🖨️ {t('Print Ballot Plan', 'Chapisha Mpango wa Kura')}</button>
            <button onClick={() => setShowFpl(true)} style={{ background: 'linear-gradient(135deg, #37003c 0%, #6a0dad 100%)', color: 'white', padding: '14px 28px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>⚽ {t('FPL View', 'Mwonekano wa Timu')}</button>
            <button onClick={restart} style={{ background: '#1a6b3c', color: 'white', padding: '14px 28px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>↺ {t('Start Over', 'Anza Upya')}</button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, justifyContent: 'center' }}>
            <a href={`https://wa.me/?text=${encodeURIComponent("I've planned my ballot with Jipange Na Kura! Visit https://jipangenakura.co.ke to plan yours.")}`}
              target="_blank" rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25d366', color: 'white', border: 'none', borderRadius: 8, padding: '12px 22px', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
              {t('Share on WhatsApp', 'Shiriki kwenye WhatsApp')}
            </a>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="https://wa.me/254700000000?text=Niongeze%20kwenye%20Jipange%20Na%20Kura%20Community" target="_blank" rel="noopener"
              style={{ fontSize: '0.78rem', color: '#25d366', fontWeight: 600, textDecoration: 'none' }}>
              📲 {t('Join our WhatsApp Community for 2027 election reminders →', 'Jiunge na Jamii yetu ya WhatsApp kwa vikumbusho vya uchaguzi wa 2027 →')}
            </a>
          </div>
        </div>
      )}
      {/* ── FPL VIEW OVERLAY ── */}
      {showFpl && (
        <FplOverlay
          selections={selections}
          county={county}
          constit={constit}
          onClose={() => setShowFpl(false)}
          t={t}
        />
      )}

      {/* ── CANDIDATE PROFILE MODAL ── */}
      {profileCand && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setProfileCand(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div style={{ background: 'white', width: '100%', maxWidth: '100%', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>

            {/* Hero */}
            <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profileCand.photo_url
                ? <img src={profileCand.photo_url.startsWith('http') ? profileCand.photo_url : `/${profileCand.photo_url}`} alt={profileCand.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', position: 'absolute', inset: 0 }} />
                : <div style={{ fontSize: '5rem', zIndex: 1, position: 'relative' }}>{profileCand.emoji || '👤'}</div>
              }
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 18, left: 20, right: 60 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{profileCand.name}</div>
                <div style={{ color: '#d1d5db', fontSize: '0.82rem', marginTop: 3 }}>
                  {[profileCand.party, `Ballot No. ${profileCand.number}`, profileCand.verified ? '✓ IEBC Verified' : ''].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button onClick={() => setProfileCand(null)} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 22px 32px' }}>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {([
                  { val: profileCand.age || '—',       lbl: t('Age', 'Umri') },
                  { val: `#${profileCand.number}`,      lbl: t('Ballot No.', 'Nambari ya Kura') },
                  { val: profileCand.prev_seats ? '1+' : '—', lbl: t('Prev. Seats', 'Viti vya Awali') },
                ] as { val: string; lbl: string }[]).map(({ val, lbl }) => (
                  <div key={lbl} style={{ textAlign: 'center', background: '#f3f0eb', borderRadius: 10, padding: '12px 8px' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#6b7280', marginTop: 4 }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Party */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#1a6b3c', marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #e8f5e9' }}>
                  {t('Party & Affiliation', 'Chama & Muungano')}
                </div>
                <p style={{ fontSize: '0.84rem', color: '#0a0a0a', margin: 0 }}>{profileCand.party}</p>
              </div>

              {/* Previous positions */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#1a6b3c', marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #e8f5e9' }}>
                  {t('Previous Positions', 'Nyadhifa Zilizoshikiliwa')}
                </div>
                {profileCand.prev_seats
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f0eb', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a6b3c', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>{profileCand.prev_seats}</span>
                    </div>
                  : <p style={{ fontSize: '0.84rem', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>{t('No previous positions on record', 'Hakuna nyadhifa zilizorekodiwa')}</p>
                }
              </div>

              {/* Manifesto */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#1a6b3c', marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #e8f5e9' }}>
                  {t('Key Manifesto Points', 'Mambo Muhimu ya Ilani')}
                </div>
                {profileCand.manifesto?.length
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {profileCand.manifesto.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.84rem', lineHeight: 1.5 }}>
                          <span style={{ color: '#1a6b3c', fontWeight: 700, flexShrink: 0 }}>→</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  : <p style={{ fontSize: '0.84rem', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>{t('Manifesto not available', 'Ilani haipatikani')}</p>
                }
              </div>

              {/* Social links */}
              {(profileCand.twitter || profileCand.facebook) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {profileCand.twitter && (
                    <a href={`https://twitter.com/${profileCand.twitter}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', background: '#e7f3ff', color: '#0a0a0a', border: '1px solid #93c5fd' }}>
                      𝕏 {profileCand.twitter}
                    </a>
                  )}
                  {profileCand.facebook && (
                    <a href={`https://facebook.com/${profileCand.facebook}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', background: '#e7f3ff', color: '#1877f2', border: '1px solid #93c5fd' }}>
                      f {profileCand.facebook}
                    </a>
                  )}
                </div>
              )}

              {/* Select from modal */}
              {seat && (
                <button
                  onClick={() => { select(seat.key as SeatKey, profileCand); setProfileCand(null) }}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', fontWeight: 700,
                    background: selections[seat.key as SeatKey]?.name === profileCand.name ? '#0d5c30' : '#1a6b3c',
                    color: 'white', cursor: 'pointer', marginTop: 8,
                  }}
                >
                  {selections[seat.key as SeatKey]?.name === profileCand.name
                    ? `✓ ${t('Already Selected', 'Tayari Umechagua')}`
                    : `✓ ${t('Select', 'Chagua')} ${profileCand.name.split(' ')[0]}`
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
