// Supabase Edge Function: submit-report
// - Verifies Cloudflare Turnstile token
// - Rate limits: max 5 reports per IP per hour
// - Inserts into watch_reports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const RATE_LIMIT       = 5    // max reports
const RATE_WINDOW_MINS = 60   // per hour

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const ip = req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? 'unknown'

    const body = await req.json()
    const { turnstileToken, category, county, constituency, ward, polling_station, description, phone, lat, lng } = body

    // ── 1. Verify Turnstile token ──
    if (TURNSTILE_SECRET) {
      const form = new FormData()
      form.append('secret', TURNSTILE_SECRET)
      form.append('response', turnstileToken ?? '')
      form.append('remoteip', ip)
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
      const result = await verify.json()
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Bot check failed. Please try again.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── 2. Rate limit by IP ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const windowStart = new Date(Date.now() - RATE_WINDOW_MINS * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('watch_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip', ip)
      .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT) {
      return new Response(JSON.stringify({ error: `Too many reports. Please wait before submitting again.` }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Insert report ──
    const { error } = await supabase.from('watch_reports').insert([{
      category, county, constituency, ward: ward || null,
      polling_station: polling_station || null,
      description, phone: phone || null,
      lat: lat ?? null, lng: lng ?? null,
      reporter_ip: ip,
    }])

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
