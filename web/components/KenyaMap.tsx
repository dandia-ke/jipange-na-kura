'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import 'leaflet/dist/leaflet.css'
import { CONSTITUENCY_PCODE, PCODE_CONSTITUENCY, COUNTY_PCODE, PCODE_COUNTY } from '@/lib/iebcCodes'

export interface KenyaMapHandle {
  findByCoords: (lat: number, lng: number) => { county: string; constituency: string } | null
  flyTo: (lat: number, lng: number) => void
}

interface WatchReport {
  id: string
  county?: string
  constituency?: string
  ward?: string
  category?: string
  description?: string
  lat?: number
  lng?: number
}

interface Props {
  county: string
  constituency: string
  ward?: string
  reports?: WatchReport[]
  onClick?: (lat: number, lng: number) => void
}

// ── Point-in-polygon (ray casting) — same algorithm as original HTML ──
function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1] // GeoJSON [lng, lat]
    const xj = ring[j][0], yj = ring[j][1]
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

function pointInFeature(lat: number, lng: number, geom: any): boolean {
  if (!geom) return false
  if (geom.type === 'Polygon')      return pointInRing(lat, lng, geom.coordinates[0])
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((p: number[][][]) => pointInRing(lat, lng, p[0]))
  return false
}

const defaultConstStyle = { color: '#2d9b5a', weight: 0.8, fillColor: '#1a6b3c', fillOpacity: 0.0, opacity: 0.5 }
const defaultCountyStyle = { color: '#1a6b3c', weight: 1.5, fillColor: '#1a6b3c', fillOpacity: 0.0, opacity: 0.5 }

const KenyaMap = forwardRef<KenyaMapHandle, Props>(function KenyaMap(
  { county, constituency, ward, reports, onClick },
  ref
) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const constLayerRef  = useRef<any>(null)
  const countyLayerRef = useRef<any>(null)
  const markerRef      = useRef<any>(null)
  const geoDataRef     = useRef<any>(null) // admin2 GeoJSON features for PiP lookup
  // Always-current prop refs — accessible from inside async fetch callbacks
  const countyRef      = useRef(county)
  const constRef       = useRef(constituency)
  const wardRef        = useRef(ward)
  countyRef.current = county
  constRef.current  = constituency
  wardRef.current   = ward

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    findByCoords(lat: number, lng: number) {
      if (!geoDataRef.current) return null
      for (const feature of geoDataRef.current.features) {
        if (pointInFeature(lat, lng, feature.geometry)) {
          const adm2pcode = feature.properties.adm2_pcode as string
          const adm1pcode = feature.properties.adm1_pcode as string
          return {
            county:        PCODE_COUNTY[adm1pcode]        ?? feature.properties.adm1_name as string,
            constituency:  PCODE_CONSTITUENCY[adm2pcode]  ?? feature.properties.adm2_name as string,
          }
        }
      }
      return null
    },
    flyTo(lat: number, lng: number) {
      if (!mapRef.current) return
      import('leaflet').then(({ default: L }) => {
        if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#1a6b3c;border:3px solid #fff;animation:pulse-ring 1.4s ease-out infinite;"></div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        })
        markerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(mapRef.current)
        mapRef.current.flyTo([lat, lng], 11, { duration: 1.8 })
      })
    },
  }))

  // ── Highlight county boundary (blue border) + all constituencies in it (light blue tint) ──
  function highlightCounty(selectedCounty: string, showLabel = true) {
    const targetPcode = COUNTY_PCODE[selectedCounty]
    countyLayerRef.current?.eachLayer((layer: any) => {
      const pcode = layer.feature?.properties?.adm1_pcode
      if (pcode === targetPcode) {
        layer.setStyle({ color: '#1a3c6b', weight: 3, fillColor: '#6b9fd4', fillOpacity: 0.12, dashArray: null })
        layer.bringToFront()
        if (showLabel) layer.openTooltip()
        else layer.closeTooltip()
      } else {
        layer.setStyle(defaultCountyStyle)
        layer.closeTooltip()
      }
    })
  }

  // ── Highlight selected constituency (gold) + county's others (blue tint) + county border ──
  function applyHighlights(selectedConst: string, selectedCounty: string) {
    const constPcode  = CONSTITUENCY_PCODE[selectedConst]
    const countyPcode = COUNTY_PCODE[selectedCounty]
    // 1. Constituency layer
    constLayerRef.current?.eachLayer((layer: any) => {
      const cPcode       = layer.feature?.properties?.adm2_pcode
      const cCountyPcode = layer.feature?.properties?.adm1_pcode
      if (cPcode === constPcode) {
        layer.setStyle({ color: '#1a3c6b', weight: 3, fillColor: '#d4a017', fillOpacity: 0.35 })
        layer.bringToFront()
      } else if (countyPcode && cCountyPcode === countyPcode) {
        // Other constituencies in the same county — blue tint
        layer.setStyle({ color: '#1a3c6b', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.08, opacity: 0.7 })
      } else {
        layer.setStyle(defaultConstStyle)
      }
    })
    // 2. County border — hide county label when constituency is already shown
    if (selectedCounty) highlightCounty(selectedCounty, !selectedConst)
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let mounted = true

    import('leaflet').then(({ default: L }) => {
      if (!mounted || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [0.0236, 37.9062],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
      }).addTo(map)

      // ── County layer (admin1) — display only, blue border when selected ──
      fetch('/ken_admin1.geojson').then(r => r.json()).then(data => {
        if (!mounted) return
        countyLayerRef.current = L.geoJSON(data, {
          style: defaultCountyStyle,
          smoothFactor: 0,
          onEachFeature: (feature: any, layer: any) => {
            const displayName = PCODE_COUNTY[feature.properties.adm1_pcode] ?? feature.properties.adm1_name
            layer.bindTooltip(displayName, {
              sticky: false, direction: 'center', permanent: false, className: 'constituency-tooltip',
            })
          },
        }).addTo(map)
        // Highlight + fly to county if already selected (handles race condition with manual entry)
        if (countyRef.current) {
          highlightCounty(countyRef.current)
          if (!constRef.current) {
            const targetPcode = COUNTY_PCODE[countyRef.current]
            countyLayerRef.current.eachLayer((layer: any) => {
              if (layer.feature?.properties?.adm1_pcode === targetPcode) {
                try {
                  const b = layer.getBounds()
                  if (b.isValid()) map.flyToBounds(b, { padding: [30, 30], duration: 0.9 })
                } catch (_) {}
              }
            })
          }
        }
      }).catch(() => {})

      // ── Constituency layer (admin2) — display only, gold selection ──
      fetch('/ken_admin2.geojson').then(r => r.json()).then(data => {
        if (!mounted) return
        geoDataRef.current = data

        constLayerRef.current = L.geoJSON(data, {
          style: defaultConstStyle,
          smoothFactor: 0,
          onEachFeature: (feature: any, layer: any) => {
            const displayName = PCODE_CONSTITUENCY[feature.properties.adm2_pcode] ?? feature.properties.adm2_name
            layer.bindTooltip(displayName, {
              sticky: false, direction: 'top', className: 'constituency-tooltip',
            })
          },
        }).addTo(map)

        // Highlight + fly to current selection if already set (handles race condition with manual entry)
        if (constRef.current || countyRef.current) {
          applyHighlights(constRef.current, countyRef.current)
          if (constRef.current) {
            const constPcode = CONSTITUENCY_PCODE[constRef.current]
            constLayerRef.current.eachLayer((layer: any) => {
              if (layer.feature?.properties?.adm2_pcode === constPcode) {
                try {
                  const b = layer.getBounds()
                  if (b.isValid()) map.flyToBounds(b, { padding: [60, 60], duration: 0.9 })
                } catch (_) {}
                layer.openTooltip()
              }
            })
          } else if (countyRef.current) {
            const countyPcode = COUNTY_PCODE[countyRef.current]
            countyLayerRef.current?.eachLayer((layer: any) => {
              if (layer.feature?.properties?.adm1_pcode === countyPcode) {
                try {
                  const b = layer.getBounds()
                  if (b.isValid()) map.flyToBounds(b, { padding: [30, 30], duration: 0.9 })
                } catch (_) {}
              }
            })
          }
        }
      }).catch(() => {})

      // ── forward map clicks to parent callback if provided ──
      if (typeof onClick === 'function') {
        map.on('click', (e: any) => {
          try { onClick(e.latlng.lat, e.latlng.lng) } catch (_) {}
        })
      }
    })

    return () => {
      mounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-apply highlights whenever county or constituency changes ──
  useEffect(() => {
    if (!constLayerRef.current && !countyLayerRef.current) return
    import('leaflet').then(() => {
      applyHighlights(constituency, county)

      if (constituency) {
        // Fly to the selected constituency's bounds and open its tooltip as a label
        const constPcode = CONSTITUENCY_PCODE[constituency]
        constLayerRef.current?.eachLayer((layer: any) => {
          if (layer.feature?.properties?.adm2_pcode === constPcode) {
            try {
              const b = layer.getBounds()
              if (b.isValid()) mapRef.current?.flyToBounds(b, { padding: [60, 60], duration: 0.9 })
            } catch (_) {}
            layer.openTooltip()
          } else {
            layer.closeTooltip()
          }
        })
      } else if (county) {
        // No constituency yet — close const tooltips, fly to county, open county label
        const countyPcode = COUNTY_PCODE[county]
        constLayerRef.current?.eachLayer((layer: any) => layer.closeTooltip())
        countyLayerRef.current?.eachLayer((layer: any) => {
          if (layer.feature?.properties?.adm1_pcode === countyPcode) {
            try {
              const b = layer.getBounds()
              if (b.isValid()) mapRef.current?.flyToBounds(b, { padding: [30, 30], duration: 0.9 })
            } catch (_) {}
            layer.openTooltip()
          } else {
            layer.closeTooltip()
          }
        })
      } else {
        constLayerRef.current?.eachLayer((layer: any) => layer.closeTooltip())
        countyLayerRef.current?.eachLayer((layer: any) => layer.closeTooltip())
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constituency, county])

  // ── Zoom tighter into constituency when ward is selected ──
  useEffect(() => {
    if (!ward || !constituency || !constLayerRef.current) return
    const constPcode = CONSTITUENCY_PCODE[constituency]
    import('leaflet').then(() => {
      constLayerRef.current?.eachLayer((layer: any) => {
        if (layer.feature?.properties?.adm2_pcode === constPcode) {
          try {
            const b = layer.getBounds()
            if (b.isValid()) mapRef.current?.flyToBounds(b, { padding: [15, 15], duration: 0.9 })
          } catch (_) {}
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ward])

  // ── optionally render report markers, adjust viewport when reports provided and no explicit location ──
  const reportLayerRef = useRef<any>(null)
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      // clear existing markers
      if (reportLayerRef.current) {
        reportLayerRef.current.clearLayers()
      } else {
        reportLayerRef.current = L.layerGroup().addTo(mapRef.current)
      }

      const points: [number, number][] = []
      reports?.forEach(r => {
        if (r.lat != null && r.lng != null) {
          points.push([r.lat, r.lng])
          const colorMap: Record<string, string> = {
            normal: '#22c55e', queues: '#f59e0b', delay: '#f97316', results: '#3b82f6', incident: '#ef4444',
          }
          const color = colorMap[r.category || ''] || '#888'
          const m = L.circleMarker([r.lat, r.lng], {
            radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 1,
          }).addTo(reportLayerRef.current)
          if (r.category || r.description) {
            m.bindPopup(
              `<div style="font-size:0.8rem; line-height:1.3;">
                <strong>${r.category ?? ''}</strong><br/>${r.description ?? ''}
               </div>`
            )
          }
        }
      })
      // fit bounds if user hasn't selected location but we have points
      if (!countyRef.current && !constRef.current && points.length) {
        try {
          const b = L.latLngBounds(points as any)
          if (b.isValid()) mapRef.current.flyToBounds(b, { padding: [40, 40], maxZoom: 8 })
        } catch (_) {}
      }
    })
  }, [reports])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(8px)',
        color: 'white', padding: '8px 18px', borderRadius: 20,
        fontSize: '0.78rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
        zIndex: 500, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }}>
        {constituency
          ? `📍 ${constituency}, ${county}`
          : county
            ? `🗺 ${county} County`
            : '🗺 Map updates as you select your location'}
      </div>
    </div>
  )
})

export default KenyaMap
