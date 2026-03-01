'use client'

import NavBar from '@/components/NavBar'
import Link from 'next/link'
import { useLang } from '@/lib/LangContext'

export default function HowToVotePage() {
  const { t } = useLang()

  const BALLOTS = [
    {
      num: 1,
      title: t('Presidential Ballot', 'Kura ya Urais'),
      sub: t('⬜ White — Form 30', '⬜ Nyeupe — Fomu 30'),
      headBg: '#616161', border: '#9e9e9e',
      desc: t('Vote for the President & Deputy President as a pair. Every registered Kenyan votes for the same national candidates.', 'Piga kura kwa Rais na Naibu Rais kama jozi. Kila Mkenya aliyesajiliwa anapiga kura kwa wagombea sawa wa kitaifa.'),
      rule: t('✓ Mark ONE candidate pair only', '✓ Weka alama kwa jozi MOJA tu'),
    },
    {
      num: 2,
      title: t('MP — National Assembly', 'Mbunge — Bunge la Taifa'),
      sub: t('🟩 Green — Form 26', '🟩 Kijani — Fomu 26'),
      headBg: '#2e7d32', border: '#2e7d32',
      desc: t('Vote for your constituency MP. They represent you in Parliament and oversee the NG-CDF fund for local development.', 'Piga kura kwa Mbunge wa jimbo lako. Anakuwakilisha Bungeni na kusimamia mfuko wa NG-CDF kwa maendeleo ya ndani.'),
      rule: t('✓ Mark ONE candidate', '✓ Weka alama kwa mgombea MMOJA'),
    },
    {
      num: 3,
      title: t('County Women Representative', 'Mwakilishi wa Wanawake wa Kaunti'),
      sub: t('🟪 Purple — Form 27', '🟪 Zambarau — Fomu 27'),
      headBg: '#7b1fa2', border: '#7b1fa2',
      desc: t('Vote for the Women Rep for your whole county. She sits in the National Assembly championing women, youth and persons with disabilities.', 'Piga kura kwa Mwakilishi wa Wanawake wa kaunti yako yote. Anakaa Bungeni akiwatetea wanawake, vijana na watu wenye ulemavu.'),
      rule: t('✓ Mark ONE candidate', '✓ Weka alama kwa mgombea MMOJA'),
    },
    {
      num: 4,
      title: t('Senator', 'Seneta'),
      sub: t('🟨 Yellow — Form 28', '🟨 Njano — Fomu 28'),
      headBg: '#c8920a', border: '#f9a825',
      desc: t('Vote for your county Senator. They represent your county in the Senate and safeguard devolution funds and county rights.', 'Piga kura kwa Seneta wa kaunti yako. Anawakilisha kaunti yako Senatini na kulinda fedha za ugatuzi na haki za kaunti.'),
      rule: t('✓ Mark ONE candidate', '✓ Weka alama kwa mgombea MMOJA'),
    },
    {
      num: 5,
      title: t('Governor', 'Gavana'),
      sub: t('🟦 Blue — Form 29', '🟦 Bluu — Fomu 29'),
      headBg: '#1565c0', border: '#1565c0',
      desc: t('Vote for your county Governor & Deputy Governor as a pair. They run county services — health, roads, agriculture and local infrastructure.', 'Piga kura kwa Gavana na Naibu Gavana wa kaunti yako kama jozi. Wanasimamia huduma za kaunti — afya, barabara, kilimo na miundombinu ya ndani.'),
      rule: t('✓ Mark ONE candidate pair', '✓ Weka alama kwa jozi MOJA'),
    },
    {
      num: 6,
      title: t('Ward MCA', 'MCA wa Kata'),
      sub: t('🟫 Beige — Form 25', '🟫 Beji — Fomu 25'),
      headBg: '#a0522d', border: '#a0522d',
      desc: t('Vote for your Ward MCA — your most local rep. They sit in the county assembly and control the Ward Development Fund (WDF) for your immediate community.', 'Piga kura kwa MCA wa Kata yako — mwakilishi wako wa karibu zaidi. Anakaa katika bunge la kaunti na kusimamia Mfuko wa Maendeleo ya Kata (WDF) kwa jamii yako ya karibu.'),
      rule: t('✓ Mark ONE candidate', '✓ Weka alama kwa mgombea MMOJA'),
    },
  ]

  const STEPS = [
    t('Arrive with your <strong>original National ID or Passport</strong>. Photocopies are not accepted.', 'Fika na <strong>Kitambulisho chako cha Kitaifa au Pasipoti halisi</strong>. Nakala hazikubaliwa.'),
    t('Queue at your specific stream — assigned by ID number. Check the notice board outside.', 'Simama foleni katika mkondo wako maalum — ulioidhihirishwa na nambari ya kitambulisho. Angalia ubao wa matangazo nje.'),
    t('The presiding officer verifies your ID and fingerprint. Your name is ticked off the register.', 'Afisa mwenyekiti anathibitisha kitambulisho chako na alama ya kidole. Jina lako linatiwa alama kwenye daftari.'),
    t('You receive <strong>6 ballot papers</strong> — one per election. Confirm you have all 6 before entering the booth.', 'Unapokea <strong>karatasi 6 za kura</strong> — moja kwa kila uchaguzi. Thibitisha una zote 6 kabla ya kuingia kijumba.'),
    t('In the private booth, place <strong>ONE mark</strong> on each ballot beside your chosen candidate. A tick ✓, cross ✗, or thumbprint — all are valid.', 'Katika kijumba cha faragha, weka <strong>alama MOJA</strong> kwenye kila karatasi karibu na mgombea wako. Tiki ✓, msalaba ✗, au alama ya kidole — zote ni sahihi.'),
    t('<strong>Fold each ballot</strong> from left to right through the centre to hide your vote, then drop it into the correct box.', '<strong>Kunja kila karatasi</strong> kutoka kushoto kwenda kulia kupitia katikati kuficha kura yako, kisha iingize kwenye sanduku sahihi.'),
    t('Your finger is marked with <strong>indelible ink</strong> to prevent double voting. Polls close at <strong>5:00 PM</strong> — if you are in the queue by 5 PM you will be allowed to vote.', 'Kidole chako kinatiwa alama na <strong>wino usiofutika</strong> kuzuia kupiga kura mara mbili. Masanduku yanafungwa saa <strong>11:00 jioni</strong> — ukiwa foleni saa 11 utaruhusiwa kupiga kura.'),
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#faf7f2' }}>
      <NavBar />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 80px', paddingTop: 80 }}>

        {/* Back button */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'white', border: '1.5px solid #e2ddd6', borderRadius: 8,
          padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600,
          color: '#0a0a0a', marginBottom: 24, textDecoration: 'none',
        }}>
          ← {t('Back', 'Rudi')}
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: 6 }}>
            🗳️ {t('Civic Education', 'Elimu ya Uraia')}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>
            {t('How to Vote in Kenya', 'Jinsi ya Kupiga Kura Kenya')}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>
            {t('Everything you need before the polling booth — the 6 ballot papers, how to mark them, and what happens step by step.', 'Kila unachohitaji kabla ya kibanda cha kupiga kura — karatasi 6 za kura, jinsi ya kuziweka alama, na kinachofuata hatua kwa hatua.')}
          </p>
        </div>

        {/* 6 Ballot Papers */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>
          {t('Your 6 Ballot Papers', 'Karatasi Zako 6 za Kura')}
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 16, marginTop: -10 }}>
          {t('Each election has its own colour — so you always know which paper is which.', 'Kila uchaguzi una rangi yake — ili ujue kila wakati karatasi ipi ni ipi.')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 36 }}>
          {BALLOTS.map((b) => (
            <div key={b.num} style={{
              background: 'white', borderRadius: 13, overflow: 'hidden',
              border: `2px solid ${b.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}>
              <div style={{ background: b.headBg, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.18)',
                  fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', flexShrink: 0,
                }}>
                  {b.num}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'white', lineHeight: 1.2 }}>{b.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.78)', marginTop: 2 }}>{b.sub}</div>
                </div>
              </div>
              <div style={{ padding: '13px 15px' }}>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 9 }}>{b.desc}</p>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, background: '#f4f4f4', borderRadius: 7, padding: '8px 11px', color: '#0a0a0a' }}>
                  {b.rule}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>
          {t('At the Polling Station — Step by Step', 'Kituoni cha Kupigia Kura — Hatua kwa Hatua')}
        </div>
        <div style={{ marginBottom: 36 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 12,
              background: 'white', borderRadius: 11, padding: '13px 15px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: '#1a6b3c',
                color: 'white', fontWeight: 900, fontSize: '0.88rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <p
                style={{ fontSize: '0.83rem', lineHeight: 1.65, color: '#0a0a0a', paddingTop: 4 }}
                dangerouslySetInnerHTML={{ __html: step }}
              />
            </div>
          ))}
        </div>

        {/* Valid marks */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 800, marginBottom: 12 }}>
            {t('Any of These Marks = Valid Vote', 'Alama Yoyote Kati ya Hizi = Kura Halali')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            {[
              ['✓', t('Tick', 'Tiki')],
              ['✗', t('Cross', 'Msalaba')],
              ['👍', t('Thumbprint', 'Alama ya Kidole')],
              ['·', t('Any mark', 'Alama yoyote')],
            ].map(([mark, label]) => (
              <div key={label} style={{
                background: 'white', border: '2px solid #1a6b3c', borderRadius: 9,
                padding: '9px 14px', textAlign: 'center', minWidth: 65,
                boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: '1.4rem' }}>{mark}</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 11,
            padding: '13px 15px', fontSize: '0.81rem', lineHeight: 1.65, color: '#92400e', marginTop: 14,
          }}>
            ⚠️ <strong style={{ color: '#78350f' }}>{t('Spoilt ballot:', 'Kura iliyoharibika:')}</strong>{' '}
            {t('If you mark more than one candidate on a ballot, or write anything else on the paper, that vote will not be counted. It does NOT affect your other 5 ballots.', 'Ikiwa utaweka alama kwa wagombea zaidi ya mmoja kwenye karatasi, au utaandika chochote kingine kwenye karatasi, kura hiyo haitahesabiwa. HAIATHIRI kura zako nyingine 5.')}
          </div>
        </div>

        {/* IEBC Source */}
        <div style={{
          textAlign: 'center', marginTop: 24, fontSize: '0.73rem', color: '#6b7280',
          padding: 12, background: 'white', borderRadius: 9, border: '1px solid #e2ddd6',
        }}>
          <strong>{t('IEBC Helpline', 'Simu ya Msaada ya IEBC')}:</strong>{' '}
          <a href="tel:0800724243" style={{ color: '#1a6b3c', fontWeight: 700 }}>0800 724 243</a> ({t('toll free', 'bure kabisa')}) &nbsp;|&nbsp;
          <a href="https://www.iebc.or.ke" target="_blank" rel="noopener" style={{ color: '#1a6b3c' }}>www.iebc.or.ke</a>
          <br />
          <span style={{ display: 'block', marginTop: 4 }}>{t('Source: Official IEBC Correctly Marked Ballot Papers Poster', 'Chanzo: Bango Rasmi la IEBC la Karatasi za Kura Zilizotiwa Alama Sahihi')}</span>
        </div>

      </div>
    </main>
  )
}
