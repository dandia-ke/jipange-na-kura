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

// ── Rating helpers (localStorage — ported from original HTML) ──
type RatingData = { votes: number[]; userVoted: boolean; userVal?: number }
type Comment    = { text: string; name: string; rating: number | null; time: string }

function ratingKey(leader: Leader) {
  const scope = leader.county || ''
  return (scope + '|' + leader.seat_type).toUpperCase().replace(/\s+/g, ' ')
}
function getRatingData(key: string): RatingData {
  try {
    const raw = localStorage.getItem('jnk_rating_' + key)
    return raw ? JSON.parse(raw) : { votes: [0,0,0,0,0], userVoted: false }
  } catch { return { votes: [0,0,0,0,0], userVoted: false } }
}
function saveRatingData(key: string, data: RatingData) {
  try { localStorage.setItem('jnk_rating_' + key, JSON.stringify(data)) } catch {}
}
function getComments(key: string): Comment[] {
  try {
    const raw = localStorage.getItem('jnk_comments_' + key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveComments(key: string, comments: Comment[]) {
  try { localStorage.setItem('jnk_comments_' + key, JSON.stringify(comments.slice(-20))) } catch {}
}

// ── Rating section (ported from showRatingSection in original HTML) ──
function RatingSection({ leader }: { leader: Leader }) {
  const { t } = useLang()
  const key = ratingKey(leader)
  const [data, setData]         = useState<RatingData>(() => getRatingData(key))
  const [comments, setComments] = useState<Comment[]>(() => getComments(key))
  const [hovered, setHovered]   = useState(0)
  const [cName, setCName]       = useState('')
  const [cText, setCText]       = useState('')
  const [cStatus, setCStatus]   = useState('')

  const total = data.votes.reduce((a, b) => a + b, 0)
  const avg   = total ? (data.votes.reduce((s, v, i) => s + v * (i + 1), 0) / total).toFixed(1) : null

  function rate(val: number) {
    if (data.userVoted) return
    const next = { ...data, votes: data.votes.map((v, i) => i === val - 1 ? v + 1 : v), userVoted: true, userVal: val }
    saveRatingData(key, next)
    setData(next)
  }

  function submitComment() {
    if (!cText.trim()) { setCStatus(t('Please write a comment.', 'Tafadhali andika maoni.')); return }
    const comment: Comment = {
      text: cText.trim(),
      name: cName.trim() || t('Anonymous', 'Bila jina'),
      rating: data.userVoted ? (data.userVal ?? null) : null,
      time: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
    const next = [...comments, comment]
    saveComments(key, next)
    setComments(next)
    setCText('')
    setCStatus(t('✓ Comment posted!', '✓ Maoni yalitumwa!'))
    setTimeout(() => setCStatus(''), 2000)
  }

  return (
    <div style={{ borderTop: '1px solid #e2ddd6', marginTop: 20, paddingTop: 18 }}>
      {/* Stars */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: 8 }}>
          {t('Rate this leader', 'Pima kiongozi huyu')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1,2,3,4,5].map(val => (
            <button
              key={val}
              disabled={data.userVoted}
              onClick={() => rate(val)}
              onMouseEnter={() => setHovered(val)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: 'none', border: 'none', cursor: data.userVoted ? 'default' : 'pointer',
                fontSize: '1.6rem', padding: '2px 1px', lineHeight: 1,
                color: (hovered ? val <= hovered : data.userVoted && val <= (data.userVal ?? 0))
                  ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.1s',
              }}
            >★</button>
          ))}
          {avg && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0a0a0a', marginLeft: 6 }}>
              {avg} / 5
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 2 }}>
            {total ? `(${total} ${total === 1 ? t('rating','tathmini') : t('ratings','tathmini')})` : t('Be the first to rate','Kuwa wa kwanza kupima')}
          </span>
        </div>
        {data.userVoted && (
          <div style={{ fontSize: '0.72rem', color: '#1a6b3c', fontWeight: 600, marginTop: 4 }}>
            {t('Thank you for your rating!', 'Asante kwa tathmini yako!')}
          </div>
        )}
      </div>

      {/* Breakdown bars */}
      {total > 0 && (
        <div style={{ marginBottom: 16 }}>
          {[5,4,3,2,1].map(star => {
            const count = data.votes[star - 1]
            const pct   = Math.round(count / total * 100)
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: '0.72rem', width: 12, textAlign: 'right', color: '#374151' }}>{star}</span>
                <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>★</span>
                <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: '0.68rem', width: 30, color: '#6b7280' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Comments list */}
      <div style={{ marginBottom: 12 }}>
        {comments.length > 0 && (
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 8 }}>
            {t('Comments', 'Maoni')} ({comments.length})
          </div>
        )}
        {comments.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: '#9ca3af', fontStyle: 'italic', padding: '6px 0' }}>
            {t('No comments yet. Be the first to share your experience.', 'Hakuna maoni bado. Kuwa wa kwanza kushiriki uzoefu wako.')}
          </div>
        ) : (
          [...comments].reverse().map((c, i) => (
            <div key={i} style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: 8, marginBottom: 6, border: '1px solid #e2ddd6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0a0a0a' }}>{c.name}</span>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{c.time}</span>
                {c.rating && <span style={{ fontSize: '0.72rem', color: '#f59e0b', marginLeft: 'auto' }}>{'★'.repeat(c.rating)}</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))
        )}
      </div>

      {/* Comment form */}
      <div style={{ display: 'grid', gap: 8 }}>
        <input
          type="text"
          value={cName}
          onChange={e => setCName(e.target.value)}
          placeholder={t('Your name (optional)', 'Jina lako (hiari)')}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
        />
        <textarea
          value={cText}
          onChange={e => setCText(e.target.value)}
          rows={3}
          placeholder={t('Share your experience or opinion…', 'Shiriki uzoefu au maoni yako…')}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
        />
        {cStatus && (
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: cStatus.startsWith('✓') ? '#1a6b3c' : '#c0392b' }}>
            {cStatus}
          </div>
        )}
        <button
          onClick={submitComment}
          style={{ padding: '9px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          {t('Post Comment →', 'Tuma Maoni →')}
        </button>
      </div>
    </div>
  )
}

export default function LeadersPage({ searchParams }: Props) {
  const { county: initialCounty = '' } = use(searchParams)
  const { t } = useLang()

  const [county, setCounty] = useState(initialCounty)
  const [constituency, setConstituency] = useState('')
  const [ward, setWard] = useState('')
  const [countyLeaders, setCountyLeaders] = useState<Leader[]>([])
  const [mp, setMp] = useState<Leader | null>(null)
  const [mca, setMca] = useState<Leader | null>(null)
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

  useEffect(() => {
    if (supabaseReady && county) {
      // Load county-level leaders (governor, senator, women rep)
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .in('seat_type', ['governor', 'senator', 'womenrep'])
        .then(({ data }) => {
          if (data) {
            const sorted = (data as Leader[]).sort(
              (a, b) => SEAT_ORDER.indexOf(a.seat_type) - SEAT_ORDER.indexOf(b.seat_type)
            )
            setCountyLeaders(sorted)
          }
        })
    } else {
      setCountyLeaders([])
    }
    // Reset lower levels when county changes
    setConstituency('')
    setWard('')
    setMp(null)
    setMca(null)
  }, [county])

  useEffect(() => {
    if (supabaseReady && county && constituency) {
      // Load MP for the constituency
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .eq('constituency', constituency)
        .eq('seat_type', 'mp')
        .single()
        .then(({ data }) => {
          setMp(data as Leader | null)
        })
    } else {
      setMp(null)
    }
    // Reset ward when constituency changes
    setWard('')
    setMca(null)
  }, [county, constituency])

  useEffect(() => {
    if (supabaseReady && county && constituency && ward) {
      // Load MCA for the ward
      supabase
        .from('current_leaders')
        .select('*')
        .eq('county', county)
        .eq('constituency', constituency)
        .eq('ward', ward)
        .eq('seat_type', 'mca')
        .single()
        .then(({ data }) => {
          setMca(data as Leader | null)
        })
    } else {
      setMca(null)
    }
  }, [county, constituency, ward])

  const constituencies = county ? (COUNTY_CONSTITUENCIES[county] ?? []) : []
  const wards = constituency ? (CONSTITUENCY_WARDS[constituency] ?? []) : []

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
              {t('Serving Kenya 2022–2027 — 141 current officeholders across all 47 counties and 290 constituencies.', 'Wakihudumia Kenya 2022–2027 — wahudumu 141 wa sasa katika kaunti zote 47 na majimbo 290.')}
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

        {/* All Three Filters - Visible on landing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              {COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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
              {constituencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {!supabaseReady ? (
          <div className="text-center py-20 text-[#6b7280]">
            <p className="text-3xl mb-3">🔌</p>
            <p className="font-semibold mb-2">{t('Supabase not configured yet', 'Supabase haijasanidiwa bado')}</p>
            <p className="text-sm">{t('Add your credentials to', 'Ongeza hati zako kwenye')}{' '}
              <code className="bg-[#f3f0eb] px-1.5 py-0.5 rounded">web/.env.local</code>
            </p>
          </div>
        ) : !county ? (
          <div className="text-center py-20 text-[#6b7280]">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="font-semibold text-[#0a0a0a] mb-1">{t('Select a county above', 'Chagua kaunti hapo juu')}</p>
            <p className="text-sm">{t('to see its Governor, Senator and Women Representative', 'kuona Gavana, Seneta na Mwakilishi wa Wanawake wake')}</p>
          </div>
        ) : (
          <>
            {/* County Leaders */}
            {countyLeaders.length > 0 && (
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
                  {countyLeaders.map((leader) => (
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
            {mp && (
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
            {mca && (
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

            {/* No leaders found message */}
            {county && countyLeaders.length === 0 && (
              <div className="text-center py-20 text-[#6b7280]">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-semibold">{t('No leaders found for', 'Hakuna viongozi waliopatikana kwa')} {county}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile drawer overlay */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            <div style={{ padding: 24, paddingTop: 40 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 900, marginBottom: 8 }}>{selected.name}</h2>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 12 }}>{selected.party}</div>
              <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: 12 }}><strong>{t('Age', 'Umri')}:</strong> {selected.age || '—'}</div>
              <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: 12 }}><strong>{t('Previous seats', 'Viti vya awali')}:</strong> {selected.prev_seats || '—'}</div>
              {selected.manifesto && selected.manifesto.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong>{t('Manifesto / notes', 'Ilani / maelezo')}</strong>
                  <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                    {selected.manifesto.map((m, i) => <li key={i} style={{ fontSize: '0.75rem', color: '#374151' }}>{m}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: 12 }}>
                <strong>{t('Verified contacts', 'Mawasiliano yaliyothibitishwa')}:</strong>{' '}
                {selected.twitter ? <a href={`https://x.com/${selected.twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1d9bf0' }}>𝕏 @{selected.twitter}</a> : t('None', 'Hakuna')}
                {selected.facebook ? <> / <a href={selected.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#1d9bf0' }}>Facebook</a></> : null}
              </div>

              {/* Rating section — ported from showRatingSection() in original HTML */}
              <RatingSection leader={selected} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
