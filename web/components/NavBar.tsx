'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LangContext'

export default function NavBar() {
  const { lang, toggleLang } = useLang()

  return (
    <nav className="nav-root" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
      <Link href="/" style={{
        fontFamily: "'Playfair Display', serif", fontSize: '1.25rem',
        fontWeight: 900, color: 'white', letterSpacing: '-0.5px',
        whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none', cursor: 'pointer',
      }}>
        Jipange Na <span style={{ color: '#d4a017' }}>Kura</span>
      </Link>

      <div className="nav-right">
        <Link href="/candidates" className="nav-btn" style={{
          background: 'white', color: '#0a0a0a', border: '1.5px solid #e2ddd6',
        }}>
          {lang === 'sw' ? '🗳 Wagombea' : '🗳 Candidates'}
        </Link>
        <Link href="/how-to-vote" className="nav-btn" style={{
          background: '#1565c0', color: 'white', border: '1.5px solid #1565c0', fontWeight: 700,
        }}>
          {lang === 'sw' ? '📋 Jinsi ya Kupiga Kura' : '📋 How to Vote'}
        </Link>
        <Link href="/watch" className="nav-btn" style={{
          background: '#c0392b', color: 'white', border: 'none', fontWeight: 700,
        }}>
          {lang === 'sw' ? '🔴 Angalia' : '🔴 Watch'}
        </Link>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="nav-btn"
          style={{
            background: lang === 'sw' ? '#1a6b3c' : '#faf7f2',
            color: lang === 'sw' ? 'white' : '#0a0a0a',
            border: '1.5px solid #e2ddd6',
            letterSpacing: '0.03em', transition: 'all 0.15s', fontSize: '0.72rem', fontWeight: 700,
          }}
        >
          🇰🇪 {lang === 'en' ? 'SW' : 'EN'}
        </button>
        {/* Kenya flag */}
        <div className="nav-flag">
          <div style={{ width: 16, height: 10, borderRadius: 2, background: '#222', border: '1px solid #555' }} />
          <div style={{ width: 16, height: 10, borderRadius: 2, background: '#c0392b' }} />
          <div style={{ width: 16, height: 10, borderRadius: 2, background: '#1a6b3c' }} />
          <div style={{ width: 16, height: 10, borderRadius: 2, background: '#ccc' }} />
        </div>
      </div>
    </nav>
  )
}
