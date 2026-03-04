#!/usr/bin/env node
'use strict'
/**
 * build_preview.js — Regenerates leaders-preview.html with complete data from all sources.
 * Usage: node scripts/build_preview.js
 */
const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toUnderscoreSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[\s/-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Escape for single-quoted JS string literal */
function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// County folder names for web/public/photos/mcas/ (some are inconsistent)
const COUNTY_FOLDER_MAP = {
  'Tharaka Nithi':    'tharaka_nithi',
  'Tharaka-Nithi':   'tharaka_nithi',
  'Elgeyo-Marakwet': 'elgeyo-marakwet',
  'Elgeyo Marakwet': 'elgeyo-marakwet',
  'West Pokot':      'west-pokot',
  'Uasin Gishu':     'uasin-gishu',
}

function getCountyFolder(county) {
  return COUNTY_FOLDER_MAP[county] || toSlug(county)
}

/** Resolve photo path for an MCA, checking actual file existence.
 *  Tries all known naming conventions:
 *  1. name with hyphens  (batch5 counties, Turkana, Nakuru, Nairobi)
 *  2. name with underscores  (Kiambu, Baringo, some older batches)
 *  3. ward with hyphens
 *  4. ward with underscores  (Makueni, some older batches)
 */
function findMcaPhoto(county, ward, mcaName) {
  const folder = getCountyFolder(county)
  const base   = path.join(ROOT, 'web', 'public', 'photos', 'mcas', folder)

  const slugsToTry = [
    toSlug(mcaName),
    toUnderscoreSlug(mcaName),
    toSlug(ward),
    toUnderscoreSlug(ward),
  ].filter((s, i, a) => s && a.indexOf(s) === i)   // deduplicate + remove empty

  for (const slug of slugsToTry) {
    for (const ext of ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG']) {
      if (fs.existsSync(path.join(base, `${slug}.${ext}`))) {
        return `web/public/photos/mcas/${folder}/${slug}.${ext}`
      }
    }
  }
  return null
}

/** Resolve photo path for a county leader (governor/senator/womenrep). */
const SEAT_DIR = { governor: 'governors', senator: 'senators', womenrep: 'women-reps' }

function findCountyLeaderPhoto(seat_type, county) {
  const dir  = SEAT_DIR[seat_type]
  if (!dir) return null
  const slug = toUnderscoreSlug(county)   // matches seed.sql filename convention
  const base = path.join(ROOT, 'web', 'public', 'photos', dir)
  for (const ext of ['png', 'PNG', 'jpg', 'JPG']) {
    if (fs.existsSync(path.join(base, `${slug}.${ext}`))) {
      return `web/public/photos/${dir}/${slug}.${ext}`
    }
  }
  // Fallback: try root photos/ (in case copies live there)
  const rootBase = path.join(ROOT, 'photos', dir)
  for (const ext of ['png', 'jpg', 'PNG', 'JPG']) {
    if (fs.existsSync(path.join(rootBase, `${slug}.${ext}`))) {
      return `photos/${dir}/${slug}.${ext}`
    }
  }
  return null
}

// ─── 1. Parse seed.sql ──────────────────────────────────────────────────────

/** Extract string-quoted tokens from one SQL VALUES row.
 *  Handles SQL escaped quotes ('') → single quote in output. */
function parseSqlStringTokens(line) {
  const fields = []
  let cur = '', inStr = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === "'" && !inStr) {
      inStr = true
    } else if (c === "'" && inStr) {
      if (line[i + 1] === "'") { cur += "'"; i++ }   // escaped quote
      else { inStr = false; fields.push(cur); cur = '' }
    } else if (inStr) {
      cur += c
    }
  }
  return fields
}

function parseSeedSql() {
  const src     = fs.readFileSync(path.join(ROOT, 'web', 'supabase', 'seed.sql'), 'utf8')
  const leaders = []
  for (const line of src.split('\n')) {
    const t = line.trim()
    if (!t.startsWith("('")) continue
    const tokens = parseSqlStringTokens(t)
    if (tokens.length < 7) continue
    // tokens: [name, party, seat_type, county, photo_url, age, prev_seats, twitter?, facebook?]
    const seat_type = tokens[2]
    if (!['governor', 'senator', 'womenrep'].includes(seat_type)) continue
    leaders.push({
      name:      tokens[0],
      party:     tokens[1],
      seat_type,
      county:    tokens[3],
      twitter:   tokens[7] || null,
    })
  }
  return leaders
}

// ─── 2. Read mp_list.json ────────────────────────────────────────────────────

function readMps() {
  const mps = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'mp_list.json'), 'utf8'))
  let photoFound = 0
  const result = mps.map(mp => {
    const slug    = toSlug(mp.constituency)
    const mpBase  = path.join(ROOT, 'photos', 'mps')
    let photo_url = null
    for (const ext of ['jpg', 'JPG', 'jpeg', 'png', 'PNG']) {
      if (fs.existsSync(path.join(mpBase, `${slug}.${ext}`))) {
        photo_url = `photos/mps/${slug}.${ext}`
        photoFound++
        break
      }
    }
    return {
      name:         mp.name,
      party:        mp.party || '',
      seat_type:    'mp',
      county:       mp.county,
      constituency: mp.constituency,
      photo_url,
      twitter:      null,
      ward:         null,
    }
  })
  console.log(`     MP photos found: ${photoFound}/${mps.length}`)
  return result
}

// ─── 3. Extract counties.ts ──────────────────────────────────────────────────

function extractBracketContent(src, varName) {
  const start = src.indexOf(varName)
  if (start === -1) throw new Error(`${varName} not found in counties.ts`)
  const braceStart = src.indexOf('{', start)
  let depth = 0, i = braceStart
  while (i < src.length) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) break }
    i++
  }
  return src.slice(braceStart, i + 1)
}

function extractCountiesTs() {
  const src = fs.readFileSync(path.join(ROOT, 'web', 'lib', 'counties.ts'), 'utf8')
  // Use Function constructor to safely evaluate the JS object literals
  // eslint-disable-next-line no-new-func
  const countyConstits = new Function('return ' + extractBracketContent(src, 'COUNTY_CONSTITUENCIES'))()
  // eslint-disable-next-line no-new-func
  const constWards     = new Function('return ' + extractBracketContent(src, 'CONSTITUENCY_WARDS'))()
  return { countyConstits, constWards }
}

// ─── 4. Read MCAs from batch5_cleaned.json ───────────────────────────────────

function readMcas() {
  const data = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts', 'batch5_cleaned.json'), 'utf8')
  )
  const mcas        = []
  let photoFound    = 0
  let photoMissing  = 0

  for (const [countyName, entries] of Object.entries(data)) {
    for (const mca of (Array.isArray(entries) ? entries : [])) {
      if (!mca.name || !mca.ward || !mca.constituency) continue
      const photo_url = findMcaPhoto(countyName, mca.ward, mca.name)
      if (photo_url) photoFound++; else photoMissing++
      mcas.push({
        name:         mca.name,
        party:        mca.party || '',
        seat_type:    'mca',
        county:       countyName,
        constituency: mca.constituency,
        ward:         mca.ward,
        photo_url,
        twitter:      null,
      })
    }
  }
  console.log(`     MCA photos found: ${photoFound}, missing: ${photoMissing}`)
  return mcas
}

// ─── 4b. Read Turkana MCAs from turkana_members.json ────────────────────────

function readTurkanaMembers(constWards) {
  const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'turkana_members.json'))
  // Strip BOM if present, then parse
  const src  = raw.toString('utf8').replace(/^\uFEFF/, '')
  const members = JSON.parse(src)

  // Build reverse map: ward name (normalised) → constituency
  const wardToConstit = {}
  for (const [constit, wards] of Object.entries(constWards)) {
    for (const w of wards) {
      wardToConstit[w.toLowerCase().trim()] = constit
    }
  }

  const mcas = []
  for (const m of members) {
    if (!m.FirstName && !m.LastName) continue
    // Clean name: remove "Hon." prefix, trim
    const name = `${m.FirstName} ${m.LastName}`.replace(/Hon\.?\s*/gi, '').replace(/\s+/g, ' ').trim()
    if (!name || name === 'N/A') continue
    // Ward: strip trailing " Ward"
    const ward = (m.Ward || '').replace(/\s+Ward\s*$/i, '').trim()
    if (!ward) continue
    const constituency = wardToConstit[ward.toLowerCase()] || ''
    const photo_url    = findMcaPhoto('Turkana', ward, name)
    mcas.push({ name, party: '', seat_type: 'mca', county: 'Turkana', constituency, ward, photo_url, twitter: null })
  }
  return mcas
}

// ─── 5. Build ALL_LEADERS JS string ─────────────────────────────────────────

function leaderLine(id, l) {
  const tw  = l.twitter   ? `'${esc(l.twitter)}'`   : 'null'
  const ph  = l.photo_url ? `'${esc(l.photo_url)}'` : 'null'
  const cs  = l.constituency ? `'${esc(l.constituency)}'` : 'null'
  const wd  = l.ward      ? `'${esc(l.ward)}'`      : 'null'
  return `    {id:'${id}', seat_type:'${l.seat_type}', county:'${esc(l.county)}', name:'${esc(l.name)}', party:'${esc(l.party)}', twitter:${tw}, photo_url:${ph}, constituency:${cs}, ward:${wd}},`
}

function buildAllLeaders(countyLeaders, mps, mcas) {
  const lines = []
  const governors  = countyLeaders.filter(l => l.seat_type === 'governor')
  const senators   = countyLeaders.filter(l => l.seat_type === 'senator')
  const womenreps  = countyLeaders.filter(l => l.seat_type === 'womenrep')

  lines.push('  // ── Governors (47) ──')
  governors.forEach((l, i) => lines.push(leaderLine(`g${String(i + 1).padStart(2, '0')}`, l)))

  lines.push('  // ── Senators (47) ──')
  senators.forEach((l, i) => lines.push(leaderLine(`s${String(i + 1).padStart(2, '0')}`, l)))

  lines.push('  // ── Women Representatives (47) ──')
  womenreps.forEach((l, i) => lines.push(leaderLine(`w${String(i + 1).padStart(2, '0')}`, l)))

  lines.push('  // ── Members of Parliament (290) ──')
  mps.forEach((l, i) => lines.push(leaderLine(`m${String(i + 1).padStart(3, '0')}`, l)))

  lines.push('  // ── Members of County Assembly ──')
  mcas.forEach((l, i) => lines.push(leaderLine(`c${String(i + 1).padStart(4, '0')}`, l)))

  return `  const ALL_LEADERS = [\n${lines.join('\n')}\n  ]`
}

// ─── 6. Build CONSTITUENCIES_MAP JS string ───────────────────────────────────

function buildConstituenciesMap(countyConstits) {
  const lines = ['  const CONSTITUENCIES_MAP = {']
  const sorted = Object.entries(countyConstits).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [county, constits] of sorted) {
    const cs = constits.map(c => `'${esc(c)}'`).join(',')
    lines.push(`    '${esc(county)}': [${cs}],`)
  }
  lines.push('  }')
  return lines.join('\n')
}

// ─── 7. Build WARD_MAP JS string ────────────────────────────────────────────

function buildWardMap(constWards) {
  const lines = ['  const WARD_MAP = {']
  for (const [constituency, wards] of Object.entries(constWards)) {
    const ws = wards.map(w => `'${esc(w)}'`).join(',')
    lines.push(`    '${esc(constituency)}': [${ws}],`)
  }
  lines.push('  }')
  return lines.join('\n')
}

// ─── 8. HTML section replacement ─────────────────────────────────────────────

/** Replace the text between startMarker (inclusive) and the first endMarker after it (inclusive). */
function replaceSection(html, startMarker, endMarker, newContent) {
  const s = html.indexOf(startMarker)
  if (s === -1) throw new Error(`Start marker not found: ${JSON.stringify(startMarker)}`)
  const e = html.indexOf(endMarker, s + startMarker.length)
  if (e === -1) throw new Error(`End marker not found after: ${JSON.stringify(startMarker)}`)
  return html.slice(0, s) + newContent + html.slice(e + endMarker.length)
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('📖  Reading data sources…')

  const countyLeaders = parseSeedSql()
  const govCount  = countyLeaders.filter(l => l.seat_type === 'governor').length
  const senCount  = countyLeaders.filter(l => l.seat_type === 'senator').length
  const wrepCount = countyLeaders.filter(l => l.seat_type === 'womenrep').length
  console.log(`  ✓ seed.sql: ${countyLeaders.length} county leaders (${govCount} gov, ${senCount} sen, ${wrepCount} wrep)`)

  const mps = readMps()
  console.log(`  ✓ mp_list.json: ${mps.length} MPs`)

  const { countyConstits, constWards } = extractCountiesTs()
  console.log(`  ✓ counties.ts: ${Object.keys(countyConstits).length} counties, ${Object.keys(constWards).length} constituencies`)

  const mcas5    = readMcas()
  console.log(`  ✓ batch5_cleaned.json: ${mcas5.length} MCAs`)
  const mcasTurk = readTurkanaMembers(constWards)
  console.log(`  ✓ turkana_members.json: ${mcasTurk.length} MCAs`)
  const mcas = [...mcas5, ...mcasTurk]

  // Attach photo paths to county leaders (governors/senators/womenreps)
  countyLeaders.forEach(l => {
    l.photo_url = findCountyLeaderPhoto(l.seat_type, l.county)
  })
  const withPhotos = countyLeaders.filter(l => l.photo_url).length
  console.log(`     County leader photos found: ${withPhotos}/${countyLeaders.length}`)

  console.log('\n🔨  Building HTML…')

  let html = fs.readFileSync(path.join(ROOT, 'leaders-preview.html'), 'utf8')

  // ── Replace ALL_LEADERS ──
  const newLeaders = buildAllLeaders(countyLeaders, mps, mcas)
  html = replaceSection(html, '  const ALL_LEADERS = [', '\n  ]', newLeaders)
  console.log('  ✓ ALL_LEADERS replaced')

  // ── Replace CONSTITUENCIES_MAP (and WARD_MAP if already present) ──
  const newConstMap = buildConstituenciesMap(countyConstits)
  const newWardMap  = buildWardMap(constWards)
  const combined    = newConstMap + '\n\n' + newWardMap

  if (html.includes('  const WARD_MAP = {')) {
    // Both blocks present — replace from CONSTITUENCIES_MAP start to WARD_MAP end
    const cmStart  = html.indexOf('  const CONSTITUENCIES_MAP = {')
    const wmStart  = html.indexOf('  const WARD_MAP = {', cmStart)
    const wmEnd    = html.indexOf('\n  }', wmStart + 20)
    if (wmEnd === -1) throw new Error('Could not find WARD_MAP closing brace')
    html = html.slice(0, cmStart) + combined + html.slice(wmEnd + 4) // +4 for \n  }
    console.log('  ✓ CONSTITUENCIES_MAP + WARD_MAP replaced (both present)')
  } else {
    html = replaceSection(html, '  const CONSTITUENCIES_MAP = {', '\n  }', combined)
    console.log('  ✓ CONSTITUENCIES_MAP replaced, WARD_MAP added')
  }

  // ── Fix corrupted 𝕏 icon ──
  // 𝕏 (U+1D54F) has UTF-8 bytes F0 9D 95 8F.
  // When misread as Windows-1252 those become 4 chars: U+00F0 U+009D U+2022 U+008F
  const CORRUPT_X = '\u00F0\u009D\u2022\u008F'
  const xIconFixes = (html.split(CORRUPT_X).length - 1)
  if (xIconFixes > 0) {
    html = html.split(CORRUPT_X).join('\u{1D54F}')   // 𝕏
    console.log(`  ✓ Fixed ${xIconFixes} corrupted 𝕏 icon(s)`)
  }

  // ── Fix corrupted ● Browse All icon (U+25CF → E2 97 8F → mangled as U+00E2 U+2014 U+008F) ──
  const CORRUPT_CIRCLE = '\u00E2\u2014\u008F'
  const circleFixes = (html.split(CORRUPT_CIRCLE).length - 1)
  if (circleFixes > 0) {
    html = html.split(CORRUPT_CIRCLE).join('\u{1F465}')   // 👥
    console.log(`  ✓ Fixed ${circleFixes} corrupted Browse All icon(s)`)
  }

  // ── Update county <select> options (all 47 counties) ──
  const countySelectMarker = 'onchange="locationSetCounty(this.value)">'
  const csIdx = html.indexOf(countySelectMarker)
  if (csIdx !== -1) {
    const optStart = html.indexOf('<option', csIdx + countySelectMarker.length)
    const optEnd   = html.indexOf('</select>', csIdx)
    if (optStart !== -1 && optEnd !== -1) {
      const sortedCounties = Object.keys(countyConstits).sort()
      const newOptions = '\n            <option value="">Select a county…</option>\n            '
        + sortedCounties.map(c => `<option>${esc(c)}</option>`).join('')
        + '\n          '
      html = html.slice(0, optStart) + newOptions.trimStart() + html.slice(optEnd)
      console.log(`  ✓ County dropdown updated: ${sortedCounties.length} counties`)
    }
  }

  // ── Update locationSetConst to use WARD_MAP instead of scanning ALL_LEADERS ──
  if (!html.includes('WARD_MAP[constituency]')) {
    // Find the unique signature of the old ward-population code
    const oldSig   = 'ALL_LEADERS.filter(l => l.seat_type === \'mca\' && l.constituency === constituency'
    const sigIdx   = html.indexOf(oldSig)
    if (sigIdx !== -1) {
      // Back up to the start of `const wards =` on that block
      const blockStart = html.lastIndexOf('\n    const wards', sigIdx) + 1
      // Find end of the `wardSel.style.opacity` line
      const opacityMarker = 'wardSel.style.opacity = wards.length > 0'
      const opacityIdx    = html.indexOf(opacityMarker, sigIdx)
      const blockEnd      = html.indexOf('\n', opacityIdx + opacityMarker.length) + 1

      const newWardCode =
        `    // Populate ward dropdown from WARD_MAP (complete IEBC ward list)\n` +
        `    const wards = WARD_MAP[constituency] || []\n` +
        `    wardSel.innerHTML = \`<option value="">\${wards.length ? 'Select a ward\u2026' : 'No wards available'}</option>\`\n` +
        `      + wards.map(w => \`<option value="\${w}">\${w}</option>\`).join('')\n` +
        `    wardSel.disabled = wards.length === 0\n` +
        `    wardSel.style.opacity = wards.length > 0 ? '1' : '0.45'\n`

      html = html.slice(0, blockStart) + newWardCode + html.slice(blockEnd)
      console.log('  ✓ locationSetConst updated to use WARD_MAP')
    } else {
      console.warn('  ⚠ Could not find ward-population code — WARD_MAP not wired up')
    }
  } else {
    console.log('  ✓ locationSetConst already uses WARD_MAP')
  }

  // ── Write output ──
  fs.writeFileSync(path.join(ROOT, 'leaders-preview.html'), html, 'utf8')

  const totalLeaders = countyLeaders.length + mps.length + mcas.length
  console.log(`\n✅  Done! leaders-preview.html regenerated:`)
  console.log(`   ${govCount} governors + ${senCount} senators + ${wrepCount} women reps + ${mps.length} MPs + ${mcas.length} MCAs`)
  console.log(`   = ${totalLeaders} total leaders`)
  console.log(`   ${Object.keys(countyConstits).length} counties in dropdown`)
  console.log(`   ${Object.keys(constWards).length} constituencies with ward maps`)
}

main()
