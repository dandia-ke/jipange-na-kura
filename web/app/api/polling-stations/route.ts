import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// CSV columns (0-indexed):
// 0=CountyCode, 1=CountyName, 2=ConstCode, 3=ConstName,
// 4=CAWCode, 5=CAWName(ward), 6=RegCentreCode, 7=RegCentreName, 8=PSCode, 9=PSName

const COUNTY_CSV: Record<string, string> = {
  'Nairobi':           'NAIROBI',
  "Murang'a":          'MURANG-A',
  'Homa Bay':          'HOMA-BAY',
  'Elgeyo-Marakwet':   'ELGEYO-MARAKWET',
  'Trans Nzoia':       'TRANS-NZOIA',
  'West Pokot':        'WEST-POKOT',
  'Tana River':        'TANA-RIVER',
  'Taita Taveta':      'TAITA-TAVETA',
  'Tharaka-Nithi':     'THARAKA-NITHI',
  'Uasin Gishu':       'UASIN-GISHU',
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())
}

// In-memory index: countyFile → wardNorm → centreCode → { name, streams }
// Built once on first request per county, then served from RAM on all subsequent requests.
type CentreInfo = { name: string; streams: number }
type WardIndex  = Map<string, Map<string, CentreInfo>>
const countyIndex = new Map<string, WardIndex>()

function buildIndex(file: string): WardIndex {
  const filePath = join(process.cwd(), 'public', 'polling-stations', `${file}.csv`)
  const lines    = readFileSync(filePath, 'utf-8').split('\n').slice(1)
  const index: WardIndex = new Map()

  for (const line of lines) {
    if (!line.trim()) continue
    const cols       = line.split(',')
    if (cols.length < 8) continue
    const wardName   = cols[5]?.trim()
    const centreCode = cols[6]?.trim()
    const centreName = cols[7]?.trim()
    if (!wardName || !centreCode || !centreName) continue

    const wardNorm = normalize(wardName)
    if (!index.has(wardNorm)) index.set(wardNorm, new Map())
    const centreMap = index.get(wardNorm)!
    const existing  = centreMap.get(centreCode)
    if (existing) existing.streams += 1
    else centreMap.set(centreCode, { name: centreName, streams: 1 })
  }
  return index
}

export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get('county')
  const ward   = request.nextUrl.searchParams.get('ward')

  if (!county || !ward) {
    return NextResponse.json({ error: 'county and ward are required' }, { status: 400 })
  }

  try {
    const file = COUNTY_CSV[county] ?? county.toUpperCase()

    if (!countyIndex.has(file)) {
      countyIndex.set(file, buildIndex(file))
    }

    const centreMap = countyIndex.get(file)!.get(normalize(ward))
    if (!centreMap) return NextResponse.json([])

    const result = Array.from(centreMap.values()).map(c => ({
      name:    toTitleCase(c.name),
      address: toTitleCase(c.name),
      ward,
      streams: c.streams,
    }))

    return NextResponse.json(result)

  } catch {
    return NextResponse.json({ error: 'Could not load polling data' }, { status: 500 })
  }
}
