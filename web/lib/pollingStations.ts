export interface PollingStation {
  name: string
  address: string
  ward: string
  streams: number
}

export async function fetchPollingStations(
  county: string,
  ward: string,
): Promise<PollingStation[]> {
  const params = new URLSearchParams({ county, ward })
  const res = await fetch(`/api/polling-stations?${params}`)
  if (!res.ok) return []
  return res.json()
}
