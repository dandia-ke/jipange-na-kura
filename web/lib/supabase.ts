import { createClient } from '@supabase/supabase-js'

export type Leader = {
  id: string
  name: string
  party: string
  seat_type: 'governor' | 'senator' | 'womenrep' | 'mp' | 'mca'
  county: string
  constituency?: string | null
  ward?: string | null
  photo_url: string | null
  verified: boolean
  ballot_no: number | null
  age: string | null
  prev_seats: string | null
  twitter: string | null
  facebook: string | null
  manifesto: string[] | null
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(url, key)

/** True once the user has filled in real credentials */
export const supabaseReady =
  url !== '' && !url.includes('your-project') && !url.includes('placeholder')
