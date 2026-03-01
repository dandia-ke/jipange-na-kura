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

function countyToCsvFile(county: string): string {
  return COUNTY_CSV[county] ?? county.toUpperCase()
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())
}

export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get('county')
  const ward   = request.nextUrl.searchParams.get('ward')

  if (!county || !ward) {
    return NextResponse.json({ error: 'county and ward are required' }, { status: 400 })
  }

  try {
    const file     = countyToCsvFile(county)
    const filePath = join(process.cwd(), 'public', 'polling-stations', `${file}.csv`)
    const text     = readFileSync(filePath, 'utf-8')
    const lines    = text.split('\n').slice(1) // skip header

    // Pass 1: find IEBC ward code by normalized name
    const wardNorm = normalize(ward)
    let targetWardCode: string | null = null
    for (const line of lines) {
      if (!line.trim()) continue
      const cols = line.split(',')
      if (cols.length < 6) continue
      const cawCode = cols[4]?.trim()
      const cawName = cols[5]?.trim()
      if (cawCode && cawName && normalize(cawName) === wardNorm) {
        targetWardCode = cawCode
        break
      }
    }
    if (!targetWardCode) return NextResponse.json([])

    // Pass 2: group streams by registration centre, filtered by ward code
    const centreMap = new Map<string, { name: string; streams: number }>()
    for (const line of lines) {
      if (!line.trim()) continue
      const cols = line.split(',')
      if (cols.length < 8) continue
      const cawCode    = cols[4]?.trim()
      const centreCode = cols[6]?.trim()
      const centreName = cols[7]?.trim()
      if (cawCode !== targetWardCode || !centreCode || !centreName) continue
      const existing = centreMap.get(centreCode)
      if (existing) existing.streams += 1
      else centreMap.set(centreCode, { name: centreName, streams: 1 })
    }

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
