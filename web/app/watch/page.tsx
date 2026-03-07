'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import dynamic from 'next/dynamic'
import type { KenyaMapHandle } from '@/components/KenyaMap'
import { useRef } from 'react'
import { COUNTIES, COUNTY_CONSTITUENCIES, CONSTITUENCY_WARDS } from '@/lib/counties'
import { fetchPollingStations, type PollingStation } from '@/lib/pollingStations'
import { supabase, supabaseReady } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { Turnstile } from '@marsidev/react-turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
const SUBMIT_REPORT_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-report`
  : ''

const ELECTION_DATE = new Date('2027-08-12T06:00:00+03:00')

function getDaysUntil() {
  const diff = ELECTION_DATE.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const STATUS_CATS = [
  { key: 'normal',   dot: '#22c55e', labelEn: '✅ Station Functioning Normally',    labelSw: '✅ Kituo Kinafanya Kazi Kawaida' },
  { key: 'queues',   dot: '#f59e0b', labelEn: '⏳ Long Queues',                     labelSw: '⏳ Foleni Ndefu' },
  { key: 'delay',    dot: '#f97316', labelEn: '🕐 Late Opening / Materials Missing', labelSw: '🕐 Kufungua Kuchelewa / Vifaa Vimekosekana' },
  { key: 'results',  dot: '#3b82f6', labelEn: '📋 Results Board Posted',             labelSw: '📋 Ubao wa Matokeo Umewekwa' },
  { key: 'incident', dot: '#ef4444', labelEn: '⚠️ Incident / Irregularity',          labelSw: '⚠️ Tukio / Ukiukwaji' },
]

const CHIPS = [
  { dot: '#22c55e', bg: '#f0fdf4', border: '#86efac', color: '#166534', labelEn: 'Normal',         labelSw: 'Kawaida' },
  { dot: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', color: '#92400e', labelEn: 'Long Queue',     labelSw: 'Foleni Ndefu' },
  { dot: '#f97316', bg: '#fff7ed', border: '#fdba74', color: '#9a3412', labelEn: 'Late / Missing', labelSw: 'Kuchelewa / Kukosekana' },
  { dot: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', color: '#1e3a8a', labelEn: 'Results Posted', labelSw: 'Matokeo Yamewekwa' },
  { dot: '#ef4444', bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', labelEn: 'Incident',       labelSw: 'Tukio' },
]

const KenyaMap = dynamic(() => import('@/components/KenyaMap'), { ssr: false })

export default function WatchPage() {
  const { t } = useLang()
  const [days, setDays]               = useState(getDaysUntil())
  const [showForm, setShowForm]       = useState(false)
  const [reportCat, setReportCat]     = useState('')
  const [rfCounty, setRfCounty]       = useState('')
  const [rfConst, setRfConst]         = useState('')
  const [rfWard, setRfWard]           = useState('')
  const [rfPollingStation, setRfPollingStation] = useState('')
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([])
  const [pollingLoading, setPollingLoading] = useState(false)
  const [rfDescription, setRfDesc]    = useState('')
  const [rfPhone, setRfPhone]         = useState('')
  const [rfLat, setRfLat]             = useState<number | null>(null)
  const [rfLng, setRfLng]             = useState<number | null>(null)
  const [rfStatus, setRfStatus]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [consented, setConsented]     = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [reports, setReports]         = useState<any[]>([])
  const mapRef = useRef<KenyaMapHandle>(null)

  useEffect(() => {
    const timer = setInterval(() => setDays(getDaysUntil()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const constituencies = rfCounty ? (COUNTY_CONSTITUENCIES[rfCounty] ?? []) : []
  const wards = rfConst ? (CONSTITUENCY_WARDS[rfConst] ?? []) : []

  useEffect(() => {
    if (!rfWard || !rfCounty) { setPollingStations([]); return }
    setPollingLoading(true)
    fetchPollingStations(rfCounty, rfWard)
      .then(setPollingStations)
      .finally(() => setPollingLoading(false))
  }, [rfWard, rfCounty])

  useEffect(() => {
    if (!supabaseReady) return
    supabase
      .from('watch_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data as any[])
      })

    const channel = supabase
      .channel('realtime:watch_reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'watch_reports' }, payload => {
        setReports(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    setRfLat(lat); setRfLng(lng)
    const loc = mapRef.current?.findByCoords(lat, lng)
    if (loc) {
      setRfCounty(loc.county)
      setRfConst(loc.constituency)
    }
  }

  async function submitReport() {
    if (!reportCat)            return setRfStatus({ msg: t('Please select what you are reporting.', 'Tafadhali chagua unachoripoti.'), ok: false })
    if (!rfCounty || !rfConst) return setRfStatus({ msg: t('Please select county and constituency.', 'Tafadhali chagua kaunti na jimbo.'), ok: false })
    if (!rfDescription.trim()) return setRfStatus({ msg: t('Please describe what you observed.', 'Tafadhali elezea ulichokiona.'), ok: false })
    setSubmitting(true)
    const payload = {
      turnstileToken,
      category: reportCat,
      county: rfCounty,
      constituency: rfConst,
      ward: rfWard || null,
      polling_station: rfPollingStation || null,
      description: rfDescription.trim(),
      phone: rfPhone || null,
      lat: rfLat,
      lng: rfLng,
    }

    let error: string | null = null
    if (SUBMIT_REPORT_URL) {
      // Use Edge Function (includes rate limiting + Turnstile verification)
      const res = await fetch(SUBMIT_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        error = json.error ?? t('Error submitting report. Please try again.', 'Hitilafu ya kutuma ripoti. Tafadhali jaribu tena.')
      }
    } else {
      // Fallback: direct Supabase insert (dev / no edge function)
      const { error: sbErr } = await supabase.from('watch_reports').insert([payload])
      if (sbErr) error = sbErr.message
    }

    setSubmitting(false)
    if (error) {
      setRfStatus({ msg: error, ok: false })
    } else {
      setRfStatus({ msg: t('✓ Report submitted! It will be reviewed before going live. Thank you.', '✓ Ripoti imetumwa! Itakaguliwa kabla ya kuonekana. Asante.'), ok: true })
      setReportCat('')
      setRfConst('')
      setRfWard('')
      setRfPollingStation('')
      setRfDesc('')
      setRfPhone('')
      setRfLat(null)
      setRfLng(null)
      setShowForm(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#faf7f2' }}>
      <NavBar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 20px 60px' }}>

        {/* Back */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1.5px solid #e2ddd6', borderRadius: 6,
          padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600,
          color: '#0a0a0a', marginBottom: 24, textDecoration: 'none',
        }}>
          ← {t('Back', 'Rudi')}
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#1a1a1a', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.25)',
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
            padding: '5px 14px', borderRadius: 20, marginBottom: 14,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
              animation: 'pulse 1.4s infinite', display: 'inline-block',
            }} />
            {t('ELECTION DAY WATCH · 2027', 'ANGALIZO LA UCHAGUZI · 2027')}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>
            {t('Uchaguzi Watch 2027', 'Angalizo la Uchaguzi 2027')}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            {t(
              "On Election Day, citizens across Kenya report live from polling stations. See every station's status in real time — and submit your own report from the ground.",
              'Siku ya Uchaguzi, wananchi kote Kenya wanaripoti moja kwa moja kutoka vituo vya kupigia kura. Angalia hali ya kila kituo wakati huo huo — na wasilisha ripoti yako kutoka uwanjani.'
            )}
          </p>
        </div>

        {/* Countdown */}
        <div style={{
          background: '#0a0a0a', color: 'white', borderRadius: 14, padding: '18px 24px',
          marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {t('Days until Election Day', 'Siku hadi Siku ya Uchaguzi')}
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, fontFamily: "'Playfair Display', serif", color: '#d4a017', lineHeight: 1 }}>
              {days}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '1.05rem', fontFamily: "'Playfair Display', serif" }}>
              {t('August 12, 2027', '12 Agosti 2027')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
              {t('Kenya General Election · Polls open 6 AM – 5 PM', 'Uchaguzi Mkuu wa Kenya · Kura 6 asubuhi – 5 jioni')}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ height: 400, marginBottom: 24 }}>
          <KenyaMap
            ref={mapRef}
            county={rfCounty}
            constituency={rfConst}
            reports={reports.filter(r => (
              (!rfCounty || r.county === rfCounty) &&
              (!rfConst  || r.constituency === rfConst)
            ))}
            onClick={handleMapClick}
          />
        </div>

        {/* Body — 2 col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}
          className="watch-body-grid">

          {/* LEFT: How it works */}
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2ddd6', overflow: 'hidden' }}>
            <div style={{ background: '#0f0f0f', color: 'white', padding: '16px 20px', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('How Uchaguzi Watch works', 'Jinsi Angalizo la Uchaguzi inavyofanya kazi')}
            </div>
            <div style={{ padding: 20 }}>
              {[
                t("<strong>You go to vote</strong> at your polling station on August 12, 2027. Polls are open 6:00 AM to 5:00 PM — if you're in the queue by 5 PM you will vote.", "<strong>Unakwenda kupiga kura</strong> kwenye kituo chako cha kupigia kura tarehe 12 Agosti 2027. Masanduku yanafunguliwa 6:00 asubuhi hadi 5:00 jioni — ukiwa foleni saa 11 utapiga kura."),
                t("<strong>While you're there, open Jipange Na Kura</strong> and tap 🔴 Watch. Hit <em>Submit a Report</em> to tell us what you see at your station — takes 30 seconds.", "<strong>Ukiwa huko, fungua Jipange Na Kura</strong> na uguse 🔴 Angalia. Bonyeza <em>Wasilisha Ripoti</em> kutuambia unachokiona kituoni — inachukua sekunde 30."),
                t('<strong>Every report is reviewed</strong> before going live. Once approved, it appears on the live map and helps other Kenyans know what to expect.', '<strong>Kila ripoti inakaguliwa</strong> kabla ya kuonekana. Baada ya kukubaliwa, inaonekana kwenye ramani ya moja kwa moja na kusaidia Wakenya wengine kujua wanachotarajia.'),
                t('<strong>After polls close</strong>, the map shows results boards being posted station by station across all 47 counties — a real-time picture of democracy in action.', '<strong>Baada ya masanduku kufungwa</strong>, ramani inaonyesha bodi za matokeo zikiwekwa kituo baada ya kituo kote kaunti 47 — picha ya moja kwa moja ya demokrasia inayofanya kazi.'),
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 3 ? 18 : 0, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#0a0a0a',
                    color: 'white', fontWeight: 900, fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: '0.83rem', lineHeight: 1.6, color: '#0a0a0a' }}
                    dangerouslySetInnerHTML={{ __html: text }} />
                </div>
              ))}

              {/* Status chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 18, paddingTop: 18, borderTop: '1px solid #e2ddd6' }}>
                {CHIPS.map(c => (
                  <div key={c.labelEn} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 600,
                    background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                    {t(c.labelEn, c.labelSw)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Submit report card */}
            <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1.5px solid #fca5a5' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 12 }}>📣 {t('Submit a Report', 'Wasilisha Ripoti')}</div>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 0 }}>
                {t('At a polling station on Election Day? Open this form, pick a status, and tell us what you see. Takes under a minute.', 'Uko kituoni cha kupigia kura Siku ya Uchaguzi? Fungua fomu hii, chagua hali, na tuambie unachokiona. Inachukua chini ya dakika moja.')}
              </p>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  width: '100%', padding: 12, background: '#dc2626', color: 'white', border: 'none',
                  borderRadius: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                  fontSize: '0.88rem', cursor: 'pointer', marginTop: 10,
                }}
              >
                + {t('Submit a Report', 'Wasilisha Ripoti')}
              </button>
            </div>

            {/* Key contacts */}
            <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1.5px solid #e2ddd6' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 12 }}>📞 {t('Key Contacts', 'Mawasiliano Muhimu')}</div>
              {[
                { org: t('IEBC Voter Helpline', 'Simu ya Msaada ya Mpiga Kura IEBC'), num: '0800 724 243', href: 'tel:0800724243', note: t('Toll free · Available Election Day', 'Bure kabisa · Inapatikana Siku ya Uchaguzi') },
                { org: t('Kenya Red Cross', 'Msalaba Mwekundu wa Kenya'),             num: '1199',         href: 'tel:1199',         note: t('Emergency assistance', 'Msaada wa dharura') },
                { org: t('Police Emergency', 'Dharura ya Polisi'),                    num: '999 / 112',    href: 'tel:999',          note: t('For serious incidents at polling stations', 'Kwa matukio makubwa kituoni cha kupigia kura') },
              ].map(c => (
                <div key={c.org} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 2 }}
                  className="last-no-border">
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.org}</div>
                  <a href={c.href} style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1a6b3c', textDecoration: 'none', letterSpacing: '0.02em' }}>{c.num}</a>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{c.note}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Report form overlay */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{
            background: 'white', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 520, maxHeight: '90vh',
            overflowY: 'auto', padding: '0 0 32px',
          }}>
            <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '12px auto 0' }} />

            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2ddd6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '1.3rem' }}>
                📣 {t('Submit an Election Report', 'Wasilisha Ripoti ya Uchaguzi')}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px 0' }}>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
                {t('Your report will be reviewed before appearing on the map. Please only report what you personally observe.', 'Ripoti yako itakaguliwa kabla ya kuonekana kwenye ramani. Tafadhali ripoti tu unachokiona wewe mwenyewe.')}
              </p>

              <div style={{ display: 'grid', gap: 14 }}>

                {/* Category */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>
                    {t('What are you reporting? *', 'Unaripoti nini? *')}
                  </label>
                  <div>
                    {STATUS_CATS.map(item => (
                      <div
                        key={item.key}
                        onClick={() => setReportCat(item.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem',
                          padding: '10px 14px', cursor: 'pointer', marginBottom: 6, borderRadius: 8,
                          fontWeight: reportCat === item.key ? 700 : 400,
                          border: reportCat === item.key ? `2px solid ${item.dot}` : '2px solid transparent',
                          background: reportCat === item.key ? `${item.dot}12` : '#ffffff',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (reportCat !== item.key) {
                            e.currentTarget.style.background = '#f5f5f5'
                            e.currentTarget.style.borderColor = '#e2ddd6'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (reportCat !== item.key) {
                            e.currentTarget.style.background = '#ffffff'
                            e.currentTarget.style.borderColor = 'transparent'
                          }
                        }}
                      >
                        <span style={{ 
                          width: 20, height: 20, borderRadius: '50%', 
                          background: reportCat === item.key ? item.dot : '#f5f5f5',
                          border: `2px solid ${reportCat === item.key ? item.dot : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.7rem',
                          color: reportCat === item.key ? '#ffffff' : 'transparent',
                          fontWeight: 700,
                        }}>
                          ✓
                        </span>
                        {t(item.labelEn, item.labelSw)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* County */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('County', 'Kaunti')} *</label>
                  <select
                    value={rfCounty}
                    onChange={e => { setRfCounty(e.target.value); setRfConst('') }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#0a0a0a', background: 'white' }}
                  >
                    <option value="">{t('— Select County —', '— Chagua Kaunti —')}</option>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Constituency */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Constituency', 'Jimbo')} *</label>
                  <select
                    value={rfConst}
                    onChange={e => { setRfConst(e.target.value); setRfWard(''); setRfPollingStation('') }}
                    disabled={!rfCounty}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#0a0a0a', background: 'white', opacity: rfCounty ? 1 : 0.6 }}
                  >
                    <option value="">{t('— Select County first —', '— Chagua Kaunti kwanza —')}</option>
                    {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Ward */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Ward', 'Kata')}</label>
                  <select
                    value={rfWard}
                    onChange={e => { setRfWard(e.target.value); setRfPollingStation('') }}
                    disabled={!rfConst}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#0a0a0a', background: 'white', opacity: rfConst ? 1 : 0.6 }}
                  >
                    <option value="">{t('— Select Constituency first —', '— Chagua Jimbo kwanza —')}</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                {/* Polling Station */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Polling Station', 'Kituo cha Kupigia Kura')}</label>
                  <select
                    value={rfPollingStation}
                    onChange={e => setRfPollingStation(e.target.value)}
                    disabled={!rfWard}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#0a0a0a', background: 'white', opacity: rfWard ? 1 : 0.6 }}
                  >
                    <option value="">{pollingLoading ? t('Loading...', 'Inapakia...') : t('— Select Ward first —', '— Chagua Kata kwanza —')}</option>
                    {pollingStations.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                {/* Coords from map click */}
                {rfLat != null && rfLng != null && (
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 6 }}>
                    🗺 {t('Coordinates', 'Kuratibu')}: {rfLat.toFixed(5)}, {rfLng.toFixed(5)}
                  </div>
                )}

                {/* Description */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Describe what you observed *', 'Elezea ulichokiona *')}</label>
                  <textarea
                    value={rfDescription}
                    onChange={e => setRfDesc(e.target.value)}
                    rows={3}
                    placeholder={t('Briefly describe what you are seeing at this polling station...', 'Elezea kwa ufupi unachokiona kituoni hiki cha kupigia kura...')}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', minHeight: 64, lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Your phone number (optional — for verification)', 'Nambari yako ya simu (hiari — kwa uthibitisho)')}</label>
                  <input
                    type="tel"
                    value={rfPhone}
                    onChange={e => setRfPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>

                {rfStatus && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 600,
                    background: rfStatus.ok ? '#f0faf4' : '#fef2f2',
                    color: rfStatus.ok ? '#1a6b3c' : '#991b1b',
                  }}>
                    {rfStatus.msg}
                  </div>
                )}

                {/* Turnstile bot check */}
                {TURNSTILE_SITE_KEY && (
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    options={{ theme: 'light', size: 'flexible' }}
                  />
                )}

                {/* Consent */}
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.78rem', color: '#374151', lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={e => setConsented(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: '#c0392b', width: 15, height: 15 }}
                  />
                  <span>
                    {t(
                      'I confirm that this report is based on my personal observation. I consent to my location data being used to verify this report in accordance with the ',
                      'Nathibitisha kwamba ripoti hii inategemea uchunguzi wangu binafsi. Nakubaliana na matumizi ya data yangu ya mahali ili kuthibitisha ripoti hii kwa mujibu wa '
                    )}
                    <a href="/privacy" target="_blank" style={{ color: '#1a6b3c', fontWeight: 600 }}>
                      {t('Privacy Policy', 'Sera ya Faragha')}
                    </a>.
                  </span>
                </label>

                <button
                  onClick={submitReport}
                  disabled={submitting || rfStatus?.ok === true || !consented || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                  style={{
                    width: '100%', padding: 14, background: '#c0392b', color: 'white', border: 'none',
                    borderRadius: 10, fontWeight: 700, fontSize: '0.92rem',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: (consented && (!TURNSTILE_SITE_KEY || turnstileToken)) ? 'pointer' : 'not-allowed',
                    opacity: (submitting || rfStatus?.ok || !consented || (!!TURNSTILE_SITE_KEY && !turnstileToken)) ? 0.6 : 1,
                  }}
                >
                  {submitting ? t('Submitting…', 'Inawasilisha…') : t('Submit Report →', 'Wasilisha Ripoti →')}
                </button>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', textAlign: 'center', marginTop: -8 }}>
                  {t('Reports are verified before going live. False reports are removed.', 'Ripoti zinakaguliwa kabla ya kuonekana. Ripoti za uongo zinaondolewa.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:720px){
          .watch-body-grid { grid-template-columns: 1fr !important; }
        }
        .last-no-border:last-child { border-bottom: none !important; padding-bottom: 0 !important; }
        @keyframes pulse { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.4; transform:scale(0.7); } }
      `}</style>
    </main>
  )
}
