'use client'

import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { useLang } from '@/lib/LangContext'

export default function PrivacyPage() {
  const { t } = useLang()
  return (
    <main style={{ minHeight: '100vh', background: '#faf7f2' }}>
      <NavBar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '88px 24px 80px' }}>

        <Link href="/" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a6b3c', textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>
          ← {t('Back to Home', 'Rudi Nyumbani')}
        </Link>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 900, marginBottom: 8 }}>
          {t('Privacy Policy', 'Sera ya Faragha')}
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 40 }}>
          {t('Last updated: March 2026', 'Imesasishwa mwisho: Machi 2026')}
        </p>

        {[
          {
            heading: t('Who we are', 'Sisi ni nani'),
            body: t(
              'Jipange Na Kura is a civic education platform helping Kenyan voters find their polling station and understand ballot choices. We do not collect personal data for commercial purposes.',
              'Jipange Na Kura ni jukwaa la elimu ya uraia linalowawezesha wapigakura wa Kenya kupata kituo chao cha kupigia kura na kuelewa chaguo za kura. Hatukusanyi data ya kibinafsi kwa madhumuni ya biashara.'
            ),
          },
          {
            heading: t('What data we collect', 'Data tunayokusanya'),
            body: t(
              'We only collect data when you voluntarily submit an election watch report. This may include: your approximate location (GPS coordinates), a description of what you observed, and optionally your phone number for verification. We do not collect names, national ID numbers, or registration details.',
              'Tunakusanya data tu unapotuma ripoti ya uchaguzi kwa hiari. Hii inaweza kujumuisha: mahali pako (kuratibu za GPS), maelezo ya unachokiona, na hiari nambari ya simu yako kwa uthibitisho. Hatukusanyi majina, nambari za kitambulisho, wala maelezo ya usajili.'
            ),
          },
          {
            heading: t('How we use it', 'Jinsi tunavyotumia data'),
            body: t(
              'Location and report data is used solely to verify and display election-day reports on the public map. Phone numbers, if provided, are used only to follow up on reports we cannot verify. We do not sell, share, or use this data for advertising.',
              'Data ya mahali na ripoti inatumika tu kuthibitisha na kuonyesha ripoti za siku ya uchaguzi kwenye ramani ya umma. Nambari za simu, ikiwa zimetolewa, zinatumika tu kufuatilia ripoti ambazo hatuwezi kuthibitisha. Hatuuzi, kushiriki, au kutumia data hii kwa matangazo.'
            ),
          },
          {
            heading: t('Data retention', 'Uhifadhi wa data'),
            body: t(
              'Election watch reports are retained for 90 days after the election date, then permanently deleted. We do not retain GPS coordinates beyond this period.',
              'Ripoti za angalizo la uchaguzi zinahifadhiwa kwa siku 90 baada ya tarehe ya uchaguzi, kisha zinafutwa kabisa. Hatuhifadhi kuratibu za GPS zaidi ya kipindi hiki.'
            ),
          },
          {
            heading: t('Your rights under Kenya\'s Data Protection Act 2019', 'Haki zako chini ya Sheria ya Ulinzi wa Data ya Kenya ya 2019'),
            body: t(
              'Under the Kenya Data Protection Act 2019, you have the right to: access data we hold about you, request correction of inaccurate data, request deletion of your data, and withdraw consent at any time. To exercise these rights, contact us via GitHub Issues.',
              'Chini ya Sheria ya Ulinzi wa Data ya Kenya ya 2019, una haki ya: kufikia data tunayoshikilia kukuhusu, kuomba marekebisho ya data isiyo sahihi, kuomba kufutwa kwa data yako, na kujiondoa idhini wakati wowote. Ili kutumia haki hizi, wasiliana nasi kupitia GitHub Issues.'
            ),
          },
          {
            heading: t('Cookies and tracking', 'Vidakuzi na ufuatiliaji'),
            body: t(
              'We do not use advertising cookies or third-party tracking. The map uses OpenStreetMap tile data (CartoCDN) governed by their own privacy policy. Language preference is stored in your browser\'s local storage only.',
              'Hatutumii vidakuzi vya matangazo au ufuatiliaji wa watu wengine. Ramani inatumia data ya ramani ya OpenStreetMap (CartoCDN) inayosimamiwa na sera yao ya faragha. Upendeleo wa lugha huhifadhiwa kwenye kumbukumbu ya ndani ya kivinjari chako tu.'
            ),
          },
          {
            heading: t('Changes to this policy', 'Mabadiliko ya sera hii'),
            body: t(
              'Material changes will be noted at the top of this page with an updated date. Continued use of the site after changes constitutes acceptance.',
              'Mabadiliko makubwa yataandikwa juu ya ukurasa huu na tarehe iliyosasishwa. Matumizi yanayoendelea ya tovuti baada ya mabadiliko yanamaanisha kukubalika.'
            ),
          },
        ].map(({ heading, body }) => (
          <section key={heading} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: '#0a0a0a' }}>
              {heading}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}

        <div style={{ marginTop: 48, padding: '20px 24px', background: '#f0faf4', borderRadius: 12, border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#1a6b3c', lineHeight: 1.6 }}>
          {t(
            'Questions about your data? Open an issue at github.com/your-repo or contact the project maintainer.',
            'Maswali kuhusu data yako? Fungua tatizo kwenye github.com/your-repo au wasiliana na mtunzaji wa mradi.'
          )}
        </div>

      </div>
    </main>
  )
}
