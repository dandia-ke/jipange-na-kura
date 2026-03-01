import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // 7 days
  },

  async headers() {
    return [
      // GeoJSON boundary files — rarely change, cache for 7 days
      {
        source: '/ken_admin1.geojson',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        source: '/ken_admin2.geojson',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      // Polling station CSVs — cache for 24h
      {
        source: '/polling-stations/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      // Leader photos — cache for 7 days
      {
        source: '/photos/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      // API polling route — cache at CDN edge for 1h
      {
        source: '/api/polling-stations',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' }],
      },
    ]
  },
};

export default nextConfig;
