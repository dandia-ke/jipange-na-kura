'use client'

import { useState, useEffect, use } from 'react'
import { supabase, supabaseReady, type Leader } from '@/lib/supabase'
import { COUNTIES, COUNTY_CONSTITUENCIES, CONSTITUENCY_WARDS } from '@/lib/counties'
import LeaderCard from '@/components/LeaderCard'
import NavBar from '@/components/NavBar'
import { useLang } from '@/lib/LangContext'

type Props = {
  searchParams: Promise<{ county?: string }>
}

const SEAT_ORDER = ['governor', 'senator', 'womenrep', 'mp', 'mca']

const SEAT_LABELS: Record<string, { en: string; sw: string }> = {
  governor:  { en: 'Governor',       sw: 'Gavana' },
  senator:   { en: 'Senator',        sw: 'Seneta' },
  womenrep:  { en: 'Women Rep',      sw: 'Mwakilishi' },
  mp:        { en: 'MP',             sw: 'Mbunge' },
  mca:       { en: 'MCA',            sw: 'MCA' },
}

export default function LeadersPage({ searchParams }: Props) {
  const { county: initialCounty = '' } = use(searchParams)
  const { t } = useLang()

  // ── Mode toggle ───────────────────────────────────────────
  const [mode, setMode] = useState<'location' | 'all'>('location')

  // ── By Location state ─────────────────────────────────────
  const [county, setCounty]               = useState(initialCounty)
  const [constituency, setConstituency]   = useState('')
  const [ward, setWard]                   = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [countyLeaders, setCountyLeaders] = useState<Leader[]>([])
  const [mp, setMp]                       = useState<Leader | null>(null)
  const [mca, setMca]                     = useState<Leader | null>(null)

  // ── Browse All state ──────────────────────────────────────
  const [browseSeat, setBrowseSeat]       = useState('governor')
  const [browseSearch, setBrowseSearch]   = useState('')
  const [browseLeaders, setBrowseLeaders] = useState<Leader[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  // ── Drawer ────────────────────────────────────────────────
  const [selected, setSelected] = useState<Leader | null>(null)

  const CONSTITUTIONAL_ROLES: Record<string, string> = {
    governor: t(
      'Head of the county executive. Implements county legislation, manages county resources and prepares the county budget. Serves a 5-year term, max 2 terms. (Art. 179, Constitution of Kenya 2010)',
      'Mkuu wa utendaji wa kaunti. Hutekeleza sheria za kaunti, kusimamia rasilimali za kaunti na kuandaa bajeti ya kaunti. Hutumikia muhula wa miaka 5, muhula 2 wa juu. (Kifungu 179, Katiba ya Kenya 2010)'
    ),
    senator: t(
      'Represents the county in the Senate. Protects county interests in Parliament, debates national legislation, and approves Division of Revenue Bills. Serves a 5-year term. (Art. 96, CoK 2010)',
      'Anawakilisha kaunti katika Seneti. Analinda maslahi ya kaunti Bungeni, anajadili sheria za kitaifa, na anaidhinisha Muswada wa Mgawanyo wa Mapato. Hutumikia muhula wa miaka 5. (Kifungu 96, Katiba ya Kenya 2010)'
    ),
    womenrep: t(
      'Elected Women Representative for the county in the National Assembly. Advocates for women, youth and persons with disabilities. Serves on parliamentary committees. (Art. 97(1)(b), CoK 2010)',
      'Mwakilishi wa Wanawake aliyechaguliwa kwa kaunti katika Bunge la Taifa. Anawatetea wanawake, vijana na watu wenye ulemavu. Hutumikia katika kamati za bunge. (Kifungu 97(1)(b), Katiba ya Kenya 2010)'
    ),
    mp: t(
      'Member of Parliament representing the constituency in the National Assembly. Makes laws, approves budgets, and oversees the executive. Serves a 5-year term. (Art. 97, CoK 2010)',
      'Mbunge anawakilisha jimbo katika Bunge la Taifa. Hutunga sheria, kuidhinisha bajeti, na kusimamia utendaji. Hutumikia muhula wa miaka 5. (Kifungu 97, Katiba ya Kenya 2010)'
    ),
    mca: t(
      'Member of County Assembly representing the ward. Makes county laws, approves county budgets, and oversees county executive. Serves a 5-year term. (Art. 177, CoK 2010)',
      'Mwanabunge wa Kaunti anawakilisha kata. Hutunga sheria za kaunti, kuidhinisha bajeti za kaunti, na kusimamia utendaji wa kaunti. Hutumikia muhula wa miaka 5. (Kifungu 177, Katiba ya Kenya 2010)'
    ),
  }

  // ── By Location: load county leaders ─────────────────────
  useEffect(() => {
    if (supabaseReady && county) {
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .in('seat_type', ['governor', 'senator', 'womenrep'])
        .then(({ data }) => {
          if (data) {
            setCountyLeaders(
              (data as Leader[]).sort(
                (a, b) => SEAT_ORDER.indexOf(a.seat_type) - SEAT_ORDER.indexOf(b.seat_type)
              )
            )
          }
        })
    } else {
      setCountyLeaders([])
    }
    setConstituency('')
    setWard('')
    setMp(null)
    setMca(null)
  }, [county])

  useEffect(() => {
    if (supabaseReady && county && constituency) {
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .eq('constituency', constituency)
        .eq('seat_type', 'mp')
        .single()
        .then(({ data }) => setMp(data as Leader | null))
    } else {
      setMp(null)
    }
    setWard('')
    setMca(null)
  }, [county, constituency])

  useEffect(() => {
    if (supabaseReady && county && constituency && ward) {
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .eq('constituency', constituency)
        .ilike('ward', ward)
        .eq('seat_type', 'mca')
        .maybeSingle()
        .then(({ data }) => setMca(data as Leader | null))
    } else {
      setMca(null)
    }
  }, [county, constituency, ward])

  // ── Browse All: load leaders for selected seat type ───────
  useEffect(() => {
    if (mode !== 'all' || !supabaseReady) return
    setBrowseLoading(true)
    supabase
      .from('current_leaders')
      .select('*')
      .eq('seat_type', browseSeat)
      .order('county')
      .then(({ data }) => {
        setBrowseLeaders(data as Leader[] ?? [])
        setBrowseLoading(false)
      })
  }, [mode, browseSeat])

  const constituencies = county ? (COUNTY_CONSTITUENCIES[county] ?? []) : []
  const wards          = constituency ? (CONSTITUENCY_WARDS[constituency] ?? []) : []

  // ── Browse All: filter + group by county ──────────────────
  const filteredBrowse = browseSearch.trim()
    ? browseLeaders.filter(l =>
        l.name.toLowerCase().includes(browseSearch.toLowerCase()) ||
        (l.constituency ?? '').toLowerCase().includes(browseSearch.toLowerCase()) ||
        (l.ward ?? '').toLowerCase().includes(browseSearch.toLowerCase())
      )
    : browseLeaders

  const browseByCounty = filteredBrowse.reduce<Record<string, Leader[]>>((acc, l) => {
    const key = l.county || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  // ── By Location: name filter ──────────────────────────────
  const filterByName = <T extends Leader>(list: T[]) =>
    locationSearch.trim()
      ? list.filter(l => l.name.toLowerCase().includes(locationSearch.toLowerCase()))
      : list

  return (
    <main className="min-h-screen bg-[#faf7f2] pb-16">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 pt-[68px]">

        {/* Hero Banner */}
        <div
          className="rounded-2xl p-7 mb-7 flex items-center justify-between gap-7 flex-wrap border border-[#2d5a2d]"
          style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a3a1a 100%)' }}
        >
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-[1.8rem] font-black text-white mb-1.5 leading-tight">
              Kenya <em className="not-italic text-[#d4a017]">{t('Leaders', 'Viongozi')}</em> {t('Directory', 'Saraka')}
            </h2>
            <p className="text-[#9ca3af] text-sm max-w-[400px] leading-relaxed">
              {t(
                'Serving Kenya 2022–2027 — officeholders across all 47 counties and 290 constituencies.',
                'Wakihudumia Kenya 2022–2027 — wahudumu wa sasa katika kaunti zote 47 na majimbo 290.'
              )}
            </p>
          </div>
          <div className="flex gap-6 flex-wrap justify-end">
            <div className="text-center">
              <div className="font-[family-name:var(--font-playfair)] text-[2.5rem] font-black text-[#d4a017] leading-none">47</div>
              <div className="text-[#9ca3af] text-[0.72rem] font-semibold uppercase tracking-widest mt-1">{t('Counties', 'Kaunti')}</div>
            </div>
            <div className="text-center border-l border-[#2d5a2d] pl-6">
              <div className="font-[family-name:var(--font-playfair)] text-[2.5rem] font-black text-[#d4a017] leading-none">290</div>
              <div className="text-[#9ca3af] text-[0.72rem] font-semibold uppercase tracking-widest mt-1">{t('Constituencies', 'Majimbo')}</div>
            </div>
            <div className="text-center border-l border-[#2d5a2d] pl-6">
              <div className="font-[family-name:var(--font-playfair)] text-[2.5rem] font-black text-[#d4a017] leading-none">1,450</div>
              <div className="text-[#9ca3af] text-[0.72rem] font-semibold uppercase tracking-widest mt-1">{t('Wards', 'Kata')}</div>
            </div>
          </div>
        </div>

        {/* Mode toggle tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['location', 'all'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-2.5 rounded-xl text-[0.82rem] font-bold transition-all ${
                mode === m
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-white text-[#6b7280] border border-[#e2ddd6] hover:border-[#0a0a0a]'
              }`}
            >
              {m === 'location' ? `📍 ${t('By Location', 'Kwa Eneo')}` : `👥 ${t('Browse All Leaders', 'Vinjari Viongozi Wote')}`}
            </button>
          ))}
        </div>

        {!supabaseReady ? (
          <div className="text-center py-20 text-[#6b7280]">
            <p className="text-3xl mb-3">🔌</p>
            <p className="font-semibold mb-2">{t('Supabase not configured yet', 'Supabase haijasanidiwa bado')}</p>
            <p className="text-sm">
              {t('Add your credentials to', 'Ongeza hati zako kwenye')}{' '}
              <code className="bg-[#f3f0eb] px-1.5 py-0.5 rounded">web/.env.local</code>
            </p>
          </div>
        ) : mode === 'all' ? (

          /* ── BROWSE ALL ─────────────────────────────────── */
          <div>
            {/* Seat type pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['governor', 'senator', 'womenrep', 'mp', 'mca'] as const).map((seat) => (
                <button
                  key={seat}
                  onClick={() => { setBrowseSeat(seat); setBrowseSearch('') }}
                  className={`px-4 py-2 rounded-full text-[0.78rem] font-bold transition-all ${
                    browseSeat === seat
                      ? 'bg-[#1a6b3c] text-white'
                      : 'bg-white text-[#374151] border border-[#e2ddd6] hover:border-[#1a6b3c]'
                  }`}
                >
                  {t(SEAT_LABELS[seat].en, SEAT_LABELS[seat].sw)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] text-[0.9rem]">🔍</span>
              <input
                type="text"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder={t('Search by name, constituency or ward…', 'Tafuta kwa jina, jimbo au kata…')}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#e2ddd6] bg-white text-[#0a0a0a] text-sm focus:outline-none focus:border-[#1a6b3c]"
              />
            </div>

            {browseLoading ? (
              <div className="text-center py-20 text-[#6b7280] text-sm">{t('Loading…', 'Inapakia…')}</div>
            ) : filteredBrowse.length === 0 ? (
              <div className="text-center py-20 text-[#6b7280]">
                <p className="text-3xl mb-3">🔍</p>
                <p className="font-semibold">{t('No results found', 'Hakuna matokeo')}</p>
              </div>
            ) : (
              Object.entries(browseByCounty).map(([cty, leaders]) => (
                <div key={cty} className="mb-8">
                  <div className="text-[0.72rem] font-bold text-[#6b7280] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[#e2ddd6]" />
                    {cty} {t('County', 'Kaunti')}
                    <span className="h-px flex-1 bg-[#e2ddd6]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {leaders.map((leader) => (
                      <LeaderCard
                        key={leader.id}
                        leader={leader}
                        roleDesc={CONSTITUTIONAL_ROLES[leader.seat_type]}
                        onClick={() => setSelected(leader)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        ) : (

          /* ── BY LOCATION ────────────────────────────────── */
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* County */}
              <div>
                <label className="block text-[0.72rem] font-bold text-[#6b7280] uppercase tracking-widest mb-2">
                  {t('County', 'Kaunti')}
                </label>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] bg-white text-[#0a0a0a] text-sm font-medium focus:outline-none focus:border-[#1a6b3c]"
                >
                  <option value="">{t('Select a county…', 'Chagua kaunti…')}</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Constituency */}
              <div>
                <label className="block text-[0.72rem] font-bold text-[#6b7280] uppercase tracking-widest mb-2">
                  {t('Constituency', 'Jimbo')}
                </label>
                <select
                  value={constituency}
                  onChange={(e) => setConstituency(e.target.value)}
                  disabled={!county}
                  className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] bg-white text-[#0a0a0a] text-sm font-medium focus:outline-none focus:border-[#1a6b3c] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{county ? t('Select a constituency…', 'Chagua jimbo…') : t('Select county first', 'Chagua kaunti kwanza')}</option>
                  {constituencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Ward */}
              <div>
                <label className="block text-[0.72rem] font-bold text-[#6b7280] uppercase tracking-widest mb-2">
                  {t('Ward', 'Kata')}
                </label>
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  disabled={!constituency}
                  className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] bg-white text-[#0a0a0a] text-sm font-medium focus:outline-none focus:border-[#1a6b3c] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{constituency ? t('Select a ward…', 'Chagua kata…') : t('Select constituency first', 'Chagua jimbo kwanza')}</option>
                  {wards.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {/* Name search */}
            {county && (
              <div className="relative mb-6">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] text-[0.9rem]">🔍</span>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder={t('Filter by name…', 'Chuja kwa jina…')}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#e2ddd6] bg-white text-[#0a0a0a] text-sm focus:outline-none focus:border-[#1a6b3c]"
                />
              </div>
            )}

            {!county ? (
              <div className="text-center py-20 text-[#6b7280]">
                <p className="text-4xl mb-4">🗺️</p>
                <p className="font-semibold text-[#0a0a0a] mb-1">{t('Select a county above', 'Chagua kaunti hapo juu')}</p>
                <p className="text-sm">{t('to see its Governor, Senator and Women Representative', 'kuona Gavana, Seneta na Mwakilishi wa Wanawake wake')}</p>
              </div>
            ) : (
              <>
                {/* County Leaders */}
                {filterByName(countyLeaders).length > 0 && (
                  <>
                    <div className="bg-[#0a0a0a] text-white rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
                      <span className="text-2xl">🏛</span>
                      <div>
                        <div className="font-bold text-[1.1rem] font-[family-name:var(--font-playfair)]">
                          {county} {t('County', 'Kaunti')}
                        </div>
                        <div className="text-[0.75rem] text-[#9ca3af]">{t('Currently serving 2022 – 2027', 'Wakihudumia sasa 2022 – 2027')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      {filterByName(countyLeaders).map((leader) => (
                        <LeaderCard
                          key={leader.id}
                          leader={leader}
                          roleDesc={CONSTITUTIONAL_ROLES[leader.seat_type]}
                          onClick={() => setSelected(leader)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* MP */}
                {mp && filterByName([mp]).length > 0 && (
                  <>
                    <div className="bg-[#1a6b3c] text-white rounded-xl px-5 py-4 mb-5 flex items-center gap-3 mt-6">
                      <span className="text-2xl">🎤</span>
                      <div>
                        <div className="font-bold text-[1.1rem] font-[family-name:var(--font-playfair)]">
                          {constituency} {t('Constituency', 'Jimbo')}
                        </div>
                        <div className="text-[0.75rem] text-[#9ca3af]">{t('Member of Parliament', 'Mbunge')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      <LeaderCard
                        leader={mp}
                        roleDesc={CONSTITUTIONAL_ROLES['mp']}
                        onClick={() => setSelected(mp)}
                      />
                    </div>
                  </>
                )}

                {/* MCA */}
                {mca && filterByName([mca]).length > 0 && (
                  <>
                    <div className="bg-[#d4a017] text-white rounded-xl px-5 py-4 mb-5 flex items-center gap-3 mt-6">
                      <span className="text-2xl">🗣️</span>
                      <div>
                        <div className="font-bold text-[1.1rem] font-[family-name:var(--font-playfair)]">
                          {ward} {t('Ward', 'Kata')}
                        </div>
                        <div className="text-[0.75rem] text-[#0a0a0a]">{t('Member of County Assembly', 'Mwanabunge wa Kaunti')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      <LeaderCard
                        leader={mca}
                        roleDesc={CONSTITUTIONAL_ROLES['mca']}
                        onClick={() => setSelected(mca)}
                      />
                    </div>
                  </>
                )}

                {county && countyLeaders.length === 0 && (
                  <div className="text-center py-20 text-[#6b7280]">
                    <p className="text-3xl mb-3">📋</p>
                    <p className="font-semibold">{t('No leaders found for', 'Hakuna viongozi waliopatikana kwa')} {county}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Profile drawer */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 360, width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

            {/* Dark header with photo */}
            <div style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a3a1a 100%)', borderRadius: '14px 14px 0 0', position: 'relative' }}>
              <button
                onClick={() => setSelected(null)}
                style={{ position: 'absolute', top: 10, right: 12, zIndex: 1, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: '1rem', lineHeight: 1, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
              {/* Full-width photo area */}
              <div style={{ height: 220, overflow: 'hidden', borderRadius: '14px 14px 0 0', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selected.photo_url ? (
                  <img
                    src={selected.photo_url.startsWith('http') ? selected.photo_url : `/${selected.photo_url}`}
                    alt={selected.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                  />
                ) : (
                  <div style={{ color: '#4b5563', fontSize: '4rem', fontWeight: 700 }}>
                    {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Name + subtitle below photo */}
              <div style={{ padding: '14px 24px 18px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 900, color: 'white', margin: '0 0 4px' }}>{selected.name}</h2>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                  {[selected.party, selected.constituency ?? selected.county].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            {/* Stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #e2ddd6' }}>
              {[
                { label: t('Age', 'Umri'), value: selected.age || '—' },
                { label: t('Ballot No.', 'Nambari'), value: selected.ballot_no != null ? `#${selected.ballot_no}` : '—' },
                { label: t('Prev. Seats', 'Viti vya awali'), value: selected.prev_seats || '—' },
              ].map((stat, i, arr) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '12px 8px', borderRight: i < arr.length - 1 ? '1px solid #e2ddd6' : undefined }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '1.05rem', color: '#0a0a0a' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Body sections */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#1a6b3c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{t('Party & Affiliation', 'Chama')}</div>
                <div style={{ fontSize: '0.88rem', color: selected.party ? '#0a0a0a' : '#9ca3af', fontStyle: selected.party ? 'normal' : 'italic' }}>
                  {selected.party || t('Not available', 'Haipatikani')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#1a6b3c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{t('Previous Positions', 'Nafasi za Awali')}</div>
                <div style={{ fontSize: '0.88rem', color: selected.prev_seats ? '#0a0a0a' : '#9ca3af', fontStyle: selected.prev_seats ? 'normal' : 'italic' }}>
                  {selected.prev_seats || t('No previous positions on record', 'Hakuna rekodi ya nafasi za awali')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#1a6b3c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{t('Key Manifesto Points', 'Pointi Kuu za Ilani')}</div>
                {selected.manifesto && selected.manifesto.length > 0 ? (
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {selected.manifesto.map((m, i) => (
                      <li key={i} style={{ fontSize: '0.84rem', color: '#374151', marginBottom: 4 }}>{m}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: '0.88rem', color: '#9ca3af', fontStyle: 'italic' }}>{t('Manifesto not available', 'Ilani haipatikani')}</div>
                )}
              </div>

              {selected.twitter ? (
                <a
                  href={`https://x.com/${selected.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', padding: '13px', background: '#1a6b3c', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: '0.92rem', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', textDecoration: 'none', marginTop: 4 }}
                >
                  ✓ {t('View on', 'Angalia kwenye')} 𝕏 @{selected.twitter}
                </a>
              ) : (
                <button
                  onClick={() => setSelected(null)}
                  style={{ width: '100%', padding: '13px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.92rem', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', marginTop: 4 }}
                >
                  ✓ {t('Close', 'Funga')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
