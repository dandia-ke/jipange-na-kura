'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { COUNTIES, COUNTY_CONSTITUENCIES, CONSTITUENCY_WARDS } from '@/lib/counties'
import { useLang } from '@/lib/LangContext'

export default function CandidatesPage() {
  const { t } = useLang()

  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<{msg:string;ok:boolean}|null>(null)
  const [cName, setCName]       = useState('')
  const [cParty, setCParty]     = useState('')
  const [cSeat, setCSeat]       = useState('')
  const [cCounty, setCCounty]   = useState('')
  const [cConst, setCConst]     = useState('')
  const [cWard, setCWard]       = useState('')
  const [cManifesto, setCManifesto] = useState('')
  const [cContact, setCContact] = useState('')

  // filtering state for candidate directory
  const [filterCounty, setFilterCounty] = useState('')
  const [filterConst, setFilterConst]   = useState('')
  const [filterSeat, setFilterSeat]     = useState('')
  const [filterWard, setFilterWard]     = useState('')
  const [candidates, setCandidates]     = useState<any[]>([])

  const constituencies = cCounty ? (COUNTY_CONSTITUENCIES[cCounty] ?? []) : []
  const filterConstituencies = filterCounty ? (COUNTY_CONSTITUENCIES[filterCounty] ?? []) : []
  const filterWards = filterConst ? (CONSTITUENCY_WARDS[filterConst] ?? []) : []

  // fetch candidate submissions according to filters
  async function loadCandidates() {
    let query = supabase.from('candidate_submissions').select('*')
    if (filterCounty) query = query.eq('county', filterCounty)
    if (filterConst) query = query.eq('constituency', filterConst)
    if (filterSeat) query = query.eq('seat_type', filterSeat)
    if (filterWard) query = query.eq('ward', filterWard)
    const { data, error } = await query
    if (!error && data) setCandidates(data as any[])
  }

  useEffect(() => {
    loadCandidates()
  }, [filterCounty, filterConst, filterSeat, filterWard])

  async function submitCandidate() {
    if (!cName.trim()) return setFormStatus({msg: t('Please enter your name.', 'Tafadhali ingiza jina lako.'), ok:false})
    if (!cCounty || !cConst) return setFormStatus({msg: t('Please select county and constituency.', 'Tafadhali chagua kaunti na jimbo.'), ok:false})
    setSubmitting(true)
    const payload: Record<string, unknown> = {
      name: cName.trim(), party: cParty, seat_type: cSeat,
      county: cCounty, constituency: cConst, ward: cWard || null, manifesto: cManifesto.trim(),
      contact: cContact || null
    }
    const { error } = await supabase.from('candidate_submissions').insert([payload])
    setSubmitting(false)
    if (error) {
      setFormStatus({msg: t('Error sending submission. Try again later.', 'Hitilafu ya kutuma. Jaribu tena baadaye.'), ok:false})
    } else {
      setFormStatus({msg: t('✓ Submission received! Thank you, we will review it.', '✓ Maombi yamepokelewa! Asante, tutayapitia.'), ok:true})
      setCName(''); setCParty(''); setCSeat(''); setCCounty(''); setCConst(''); setCWard('')
      setCManifesto(''); setCContact('')
      setShowForm(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#faf7f2' }}>
      <NavBar />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px', paddingTop: 80, width: '100%' }}>

        {/* Back */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none',
          border: '1.5px solid #e2ddd6', borderRadius: 6, padding: '8px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600,
          cursor: 'pointer', color: '#0a0a0a', marginBottom: 24, textDecoration: 'none',
        }}>
          ← {t('Back to Ballot Planner', 'Rudi kwa Mpangaji wa Kura')}
        </Link>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a3a1a 100%)',
          borderRadius: 16, padding: '32px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 28, border: '1px solid #2d5a2d', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 900, color: 'white', marginBottom: 6, lineHeight: 1.2 }}>
              🗳 Kenya <em style={{ color: '#d4a017', fontStyle: 'normal' }}>{t('2027 Candidates', 'Wagombea wa 2027')}</em>
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', maxWidth: 400, lineHeight: 1.5 }}>
              {t('Browse and submit 2027 candidate profiles across all 47 counties, 290 constituencies and 1,450 wards.', 'Tazama na wasilisha wasifu wa wagombea wa 2027 katika kaunti zote 47, majimbo 290 na kata 1,450.')}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 24, justifyItems: 'center', minWidth: '280px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 900, color: '#d4a017', lineHeight: 1 }}>47</div>
              <div style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{t('Counties', 'Kaunti')}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #2d5a2d', paddingLeft: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 900, color: '#d4a017', lineHeight: 1 }}>290</div>
              <div style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{t('Constituencies', 'Majimbo')}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #2d5a2d', paddingLeft: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 900, color: '#d4a017', lineHeight: 1 }}>1,450</div>
              <div style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{t('Wards', 'Kata')}</div>
            </div>
          </div>
        </div>

        {/* Candidates panel */}
        <div>
          {/* filter controls */}
          <div className="candidates-filter-controls">
            <div className="candidates-filter-group">
              <div className="candidates-filter-label">{t('County', 'Kaunti')}</div>
              <select value={filterCounty} onChange={e => { setFilterCounty(e.target.value); setFilterConst(''); setFilterWard('') }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
                <option value="">{t('All Counties', 'Kaunti Zote')}</option>
                {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="candidates-filter-group">
              <div className="candidates-filter-label">{t('Constituency', 'Jimbo')}</div>
              <select value={filterConst} onChange={e => { setFilterConst(e.target.value); setFilterWard('') }} disabled={!filterCounty}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", opacity: filterCounty ? 1 : 0.6, boxSizing: 'border-box' }}>
                <option value="">{t('All Constituencies', 'Majimbo Yote')}</option>
                {filterConstituencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="candidates-filter-group">
              <div className="candidates-filter-label">{t('Seat Type', 'Aina ya Kiti')}</div>
              <select value={filterSeat} onChange={e => { setFilterSeat(e.target.value); setFilterWard('') }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
                <option value="">{t('Any Role', 'Jukumu Lolote')}</option>
                <option value="president">{t('President', 'Rais')}</option>
                <option value="governor">{t('Governor', 'Gavana')}</option>
                <option value="senator">{t('Senator', 'Seneta')}</option>
                <option value="womenrep">{t('Women Rep', 'Mwakilishi wa Wanawake')}</option>
                <option value="mp">{t('Member of Parliament', 'MBunge')}</option>
                <option value="mca">{t('Ward MCA', 'MCA wa Kata')}</option>
              </select>
            </div>
            {filterSeat === 'mca' && (
              <div className="candidates-filter-group">
                <div className="candidates-filter-label">
                  {t('Ward', 'Kata')} <span style={{ color: '#1a6b3c', fontSize: '0.68rem' }}>{t('(MCA only)', '(MCA Pekee)')}</span>
                </div>
                <select value={filterWard} onChange={e => setFilterWard(e.target.value)} disabled={!filterConst}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", opacity: filterConst ? 1 : 0.35, pointerEvents: filterConst ? 'auto' : 'none', boxSizing: 'border-box' }}>
                  <option value="">{t('All Wards', 'Kata Zote')}</option>
                  {filterWards.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* info panel when no candidates */}
          {candidates.length === 0 ? (
            <div style={{
              fontSize: '0.82rem', color: '#6b7280', marginBottom: 20, padding: '10px 14px',
              background: 'white', borderRadius: 8, borderLeft: '3px solid #d4a017',
            }}>
              📋 {t('Candidate profiles will appear here once verified. Use the filters above or the button below to submit a profile.', 'Wasifu wa wagombea utaonekana hapa baada ya kuthibitishwa. Tumia vichujio hapo juu au kitufe hapa chini kuwasilisha wasifu.')}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {candidates.map(c => (
                <div key={c.id} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2ddd6' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 2 }}>{c.party || t('Independent', 'Huru')}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{c.seat_type || ''}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                    {c.county}{c.constituency ? ' / ' + c.constituency : ''}{c.ward ? ' / ' + c.ward : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 40, padding: 24, background: 'white', borderRadius: 14, border: '1.5px solid #e2ddd6', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📬</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{t('Are you a 2027 candidate?', 'Je, wewe ni mgombea wa 2027?')}</div>
            <div style={{ fontSize: '0.84rem', color: '#6b7280', marginBottom: 16, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
              {t('Submit your profile — name, party, contacts and manifesto — to appear in this directory. All submissions are reviewed before publishing.', 'Wasilisha wasifu wako — jina, chama, mawasiliano na ilani — kuonekana katika saraka hii. Maombi yote yanakaguliwa kabla ya kuchapishwa.')}
            </div>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'inline-block', padding: '10px 20px', background: '#1a6b3c',
                color: 'white', border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              ✉ {t('Submit Your Profile', 'Wasilisha Wasifu Wako')}
            </button>
          </div>
        </div>

      </div>

      {/* Candidate submission overlay */}
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
                ✉ {t('Candidate Profile Submission', 'Uwasilishaji wa Wasifu wa Mgombea')}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280', padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
                {t('Fields marked * are required. All submissions are reviewed before appearing in the directory.', 'Sehemu zenye * zinahitajika. Maombi yote yanakaguliwa kabla ya kuonekana katika saraka.')}
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Name', 'Jina')} *</label>
                  <input type="text" value={cName} onChange={e => setCName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Party', 'Chama')}</label>
                  <input type="text" value={cParty} onChange={e => setCParty(e.target.value)} placeholder="e.g. UDA, ODM"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Seat Type', 'Aina ya Kiti')}</label>
                  <select value={cSeat} onChange={e => { setCSeat(e.target.value); setCWard('') }} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }}>
                    <option value="">{t('— Choose role —', '— Chagua jukumu —')}</option>
                    <option value="president">{t('President', 'Rais')}</option>
                    <option value="governor">{t('Governor', 'Gavana')}</option>
                    <option value="senator">{t('Senator', 'Seneta')}</option>
                    <option value="womenrep">{t('Women Rep', 'Mwakilishi wa Wanawake')}</option>
                    <option value="mp">{t('Member of Parliament', 'MBunge')}</option>
                    <option value="mca">{t('Ward MCA', 'MCA wa Kata')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('County', 'Kaunti')} *</label>
                  <select value={cCounty} onChange={e => { setCCounty(e.target.value); setCConst('') }} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }}>
                    <option value="">{t('— Select County —', '— Chagua Kaunti —')}</option>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Constituency', 'Jimbo')} *</label>
                  <select value={cConst} onChange={e => setCConst(e.target.value)} disabled={!cCounty} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", opacity: cCounty ? 1 : 0.6 }}>
                    <option value="">{t('— Select County first —', '— Chagua Kaunti kwanza —')}</option>
                    {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {cSeat === 'mca' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Ward (MCA Only)', 'Kata (MCA Pekee)')}</label>
                    <select value={cWard} onChange={e => setCWard(e.target.value)} disabled={!cConst} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", opacity: cConst ? 1 : 0.6 }}>
                      <option value="">{t('— Select Ward —', '— Chagua Kata —')}</option>
                      {cConst && CONSTITUENCY_WARDS[cConst]?.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Manifesto / Notes', 'Ilani / Maelezo')}</label>
                  <textarea value={cManifesto} onChange={e => setCManifesto(e.target.value)} rows={3} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', minHeight: 64, lineHeight: 1.5, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 4, display: 'block' }}>{t('Contact (email/phone)', 'Mawasiliano (barua pepe/simu)')}</label>
                  <input type="text" value={cContact} onChange={e => setCContact(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif" }} />
                </div>
                {formStatus && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 600,
                    background: formStatus.ok ? '#f0faf4' : '#fef2f2',
                    color: formStatus.ok ? '#1a6b3c' : '#991b1b' }}>
                    {formStatus.msg}
                  </div>
                )}
                <button onClick={submitCandidate} disabled={submitting || formStatus?.ok === true} style={{
                  width: '100%', padding: 14, background: '#1a6b3c', color: 'white', border: 'none',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.92rem',
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  opacity: (submitting || formStatus?.ok) ? 0.6 : 1,
                }}>
                  {submitting ? t('Submitting…', 'Inawasilisha…') : t('Send Submission →', 'Tuma Maombi →')}
                </button>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', textAlign: 'center', marginTop: -8 }}>
                  {t('All submissions are reviewed before appearing live. False or incomplete entries may be discarded.', 'Maombi yote yanakaguliwa kabla ya kuonekana. Maingizo ya uongo au yasiyokamilika yanaweza kutupwa.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
