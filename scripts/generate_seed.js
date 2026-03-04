#!/usr/bin/env node
'use strict'
/**
 * generate_seed.js — Generates web/supabase/seed_mps_mcas.sql
 * Covers: 290 MPs + MCAs from all available sources (~860 MCAs, 28 counties)
 * Usage: node scripts/generate_seed.js
 */
const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[''`]/g, '').replace(/\//g, '-')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function toUnderscoreSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[''`]/g, '').replace(/[\s/-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

/** Escape for SQL single-quoted string */
function esc(str) {
  return (str || '').replace(/'/g, "''")
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath)
  return JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''))
}

function sqlVal(v) {
  if (v === null || v === undefined || v === '') return 'NULL'
  return `'${esc(String(v))}'`
}

// ─── Extract CONSTITUENCY_WARDS from counties.ts ────────────────────────────

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

const countiesSrc = fs.readFileSync(path.join(ROOT, 'web/lib/counties.ts'), 'utf8')
const constWards  = new Function('return ' + extractBracketContent(countiesSrc, 'CONSTITUENCY_WARDS'))()

// Build reverse map: normalized ward name → constituency
const WARD_TO_CONST = {}
for (const [constituency, wards] of Object.entries(constWards)) {
  for (const ward of wards) {
    WARD_TO_CONST[ward.toLowerCase().trim()] = constituency
  }
}

function findConstituency(wardName) {
  if (!wardName) return null
  return WARD_TO_CONST[wardName.toLowerCase().trim()] || null
}

// ─── Photo resolution ────────────────────────────────────────────────────────

const COUNTY_FOLDER_MAP = {
  'Tharaka Nithi': 'tharaka_nithi', 'Tharaka-Nithi': 'tharaka_nithi',
  'Elgeyo-Marakwet': 'elgeyo-marakwet', 'Elgeyo Marakwet': 'elgeyo-marakwet',
  'West Pokot': 'west-pokot', 'Uasin Gishu': 'uasin-gishu',
}
function getCountyFolder(county) {
  return COUNTY_FOLDER_MAP[county] || toSlug(county)
}

function findMcaPhoto(county, ward, name) {
  const folder = getCountyFolder(county)
  const base   = path.join(ROOT, 'web/public/photos/mcas', folder)
  if (!fs.existsSync(base)) return null
  const slugs = [
    toSlug(name), toUnderscoreSlug(name), toSlug(ward), toUnderscoreSlug(ward),
  ].filter((s, i, a) => s && a.indexOf(s) === i)
  for (const slug of slugs)
    for (const ext of ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'])
      if (fs.existsSync(path.join(base, `${slug}.${ext}`)))
        return `photos/mcas/${folder}/${slug}.${ext}`
  return null
}

function findMpPhoto(constituency) {
  const slug = toSlug(constituency)
  for (const ext of ['jpg', 'JPG', 'jpeg', 'png', 'PNG'])
    if (fs.existsSync(path.join(ROOT, `web/public/photos/mps/${slug}.${ext}`)))
      return `photos/mps/${slug}.${ext}`
  return null
}

// ─── Collect rows ────────────────────────────────────────────────────────────

const rows = []  // { name, party, seat_type, county, constituency, ward, photo_url }

// ── 1. MPs (290) ──────────────────────────────────────────────────────────────
const mps = readJson(path.join(ROOT, 'scripts/mp_list.json'))
let mpPhotos = 0
for (const mp of mps) {
  const photo = findMpPhoto(mp.constituency)
  if (photo) mpPhotos++
  rows.push({
    name: mp.name, party: mp.party || null,
    seat_type: 'mp', county: mp.county,
    constituency: mp.constituency, ward: null,
    photo_url: photo,
  })
}
console.log(`MPs: ${mps.length} rows, ${mpPhotos} photos`)

// ── 2. MCAs from scraped_data/ (21 county files) ─────────────────────────────
const SCRAPED_COUNTY_NAMES = {
  baringo: 'Baringo', elgeyo_marakwet: 'Elgeyo-Marakwet', embu: 'Embu',
  garissa: 'Garissa', isiolo: 'Isiolo', kiambu: 'Kiambu', kilifi: 'Kilifi',
  kwale: 'Kwale', machakos: 'Machakos', makueni: 'Makueni', marsabit: 'Marsabit',
  nyandarua: 'Nyandarua', nyeri: 'Nyeri', samburu: 'Samburu',
  taitataveta: 'Taita Taveta', tanariver: 'Tana River', tharakanithi: 'Tharaka-Nithi',
  uasin_gishu: 'Uasin Gishu', west_pokot: 'West Pokot',
}

for (const [fileKey, countyName] of Object.entries(SCRAPED_COUNTY_NAMES)) {
  const filePath = path.join(ROOT, `scraped_data/${fileKey}_mca_list.json`)
  if (!fs.existsSync(filePath)) { console.warn(`  WARN: ${filePath} not found`); continue }
  const mcas = readJson(filePath)
  let added = 0
  for (const m of mcas) {
    if (!m.name || m.name.toLowerCase().includes('speaker')) continue
    // photo_url in scraped data has leading slash — strip it
    const rawPhoto = m.photo_url ? m.photo_url.replace(/^\//, '') : null
    rows.push({
      name: m.name, party: m.party || null,
      seat_type: 'mca', county: countyName,
      constituency: m.constituency || findConstituency(m.ward) || null,
      ward: m.ward || null, photo_url: rawPhoto,
    })
    added++
  }
  console.log(`  ${countyName}: ${added} MCAs`)
}

// ── 3. Mombasa (has county but no constituency) ───────────────────────────────
{
  const mcas = readJson(path.join(ROOT, 'scraped_data/mombasa_mca_list.json'))
  let added = 0
  for (const m of mcas) {
    if (!m.name) continue
    const constituency = m.constituency || findConstituency(m.ward) || null
    const rawPhoto = m.photo_url ? m.photo_url.replace(/^\//, '') : findMcaPhoto('Mombasa', m.ward, m.name)
    rows.push({
      name: m.name, party: m.party || null,
      seat_type: 'mca', county: 'Mombasa',
      constituency, ward: m.ward || null, photo_url: rawPhoto,
    })
    added++
  }
  console.log(`  Mombasa: ${added} MCAs`)
}

// ── 4. Nakuru (name + ward only, external photoUrl ignored) ──────────────────
{
  const mcas = readJson(path.join(ROOT, 'scraped_data/nakuru_mca_list.json'))
  let added = 0
  for (const m of mcas) {
    if (!m.name || m.ward === 'Speaker To The Assembly') continue
    const constituency = findConstituency(m.ward) || null
    const photo = findMcaPhoto('Nakuru', m.ward, m.name)
    rows.push({
      name: m.name, party: null,
      seat_type: 'mca', county: 'Nakuru',
      constituency, ward: m.ward || null, photo_url: photo,
    })
    added++
  }
  console.log(`  Nakuru: ${added} MCAs`)
}

// ── 5. batch5_cleaned.json (Bungoma, Siaya, Kisumu, Migori, Nyamira, Nairobi) ─
{
  const batch5 = readJson(path.join(ROOT, 'scripts/batch5_cleaned.json'))
  for (const [county, mcas] of Object.entries(batch5)) {
    let added = 0
    for (const m of mcas) {
      if (!m.name) continue
      const photo = findMcaPhoto(county, m.ward, m.name)
      rows.push({
        name: m.name, party: null,
        seat_type: 'mca', county,
        constituency: m.constituency || findConstituency(m.ward) || null,
        ward: m.ward || null, photo_url: photo,
      })
      added++
    }
    console.log(`  ${county} (batch5): ${added} MCAs`)
  }
}

// ── 6. Turkana (BOM-prefixed JSON) ───────────────────────────────────────────
{
  const raw  = fs.readFileSync(path.join(ROOT, 'scripts/turkana_members.json'))
  const data = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''))
  let added = 0
  for (const m of data) {
    const rawFirst = (m.FirstName || '').replace(/^\s*Hon\.?\s*/i, '').trim()
    const last  = (m.LastName  || '').trim()
    const name  = `${rawFirst} ${last}`.replace(/\s+/g, ' ').trim()
    if (!name) continue
    const ward  = (m.Ward || '').replace(/\s*Ward$/i, '').trim()
    const constituency = findConstituency(ward) || null
    // Profile pic: "Hon._Aule_Naoyakope_Ebenyo.png" → try toSlug(name)
    const photo = findMcaPhoto('Turkana', ward, name)
    rows.push({
      name, party: null,
      seat_type: 'mca', county: 'Turkana',
      constituency, ward: ward || null, photo_url: photo,
    })
    added++
  }
  console.log(`  Turkana (members): ${added} MCAs`)
}

// ─── Generate SQL ─────────────────────────────────────────────────────────────

const photoCount = rows.filter(r => r.photo_url).length
const mcaCount   = rows.filter(r => r.seat_type === 'mca').length
console.log(`\nTotal: ${rows.length} rows (${mps.length} MPs + ${mcaCount} MCAs), ${photoCount} with photos`)

const chunks = []
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200)
  const values = chunk.map(r =>
    `(${sqlVal(r.name)},${sqlVal(r.party)},'${r.seat_type}',${sqlVal(r.county)},${sqlVal(r.constituency)},${sqlVal(r.ward)},${sqlVal(r.photo_url)},true)`
  ).join(',\n')
  chunks.push(`INSERT INTO current_leaders (name,party,seat_type,county,constituency,ward,photo_url,verified)\nVALUES\n${values}\nON CONFLICT DO NOTHING;\n`)
}

const sql = `-- Jipange Na Kura — MPs + MCAs seed
-- Generated by: node scripts/generate_seed.js
-- Rows: ${rows.length} (${mps.length} MPs + ${mcaCount} MCAs across 28 counties)
-- Photos: ${photoCount} of ${rows.length}
-- Run in Supabase SQL Editor AFTER seed.sql

-- Ensure columns exist and relax constraints for partial data
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS constituency text;
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS ward text;
ALTER TABLE current_leaders ALTER COLUMN party DROP NOT NULL;

-- Deduplicate existing rows before adding unique constraint
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY seat_type, county, COALESCE(constituency, ''), COALESCE(ward, ''), name
    ORDER BY id
  ) AS rn FROM current_leaders
)
DELETE FROM current_leaders WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint to prevent duplicate runs
ALTER TABLE current_leaders DROP CONSTRAINT IF EXISTS current_leaders_unique;
ALTER TABLE current_leaders ADD CONSTRAINT current_leaders_unique UNIQUE NULLS NOT DISTINCT (seat_type, county, constituency, ward, name);

-- Expand seat_type check constraint to include mp and mca
ALTER TABLE current_leaders DROP CONSTRAINT IF EXISTS current_leaders_seat_type_check;
ALTER TABLE current_leaders ADD CONSTRAINT current_leaders_seat_type_check
  CHECK (seat_type IN ('governor', 'senator', 'womenrep', 'mp', 'mca'));

${chunks.join('\n')}
`

const outPath = path.join(ROOT, 'web/supabase/seed_mps_mcas.sql')
fs.writeFileSync(outPath, sql, 'utf8')
console.log(`\nWrote ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)}KB)`)
