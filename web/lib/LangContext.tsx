'use client'

import { createContext, useContext, useState } from 'react'

type Lang = 'en' | 'sw'

interface LangContextValue {
  lang: Lang
  toggleLang: () => void
  t: (en: string, sw: string) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  toggleLang: () => {},
  t: (en) => en,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const toggleLang = () => setLang(l => l === 'en' ? 'sw' : 'en')
  const t = (en: string, sw: string) => lang === 'sw' ? sw : en
  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
