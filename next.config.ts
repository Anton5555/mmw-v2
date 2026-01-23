import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React Compiler (stable in v16)
  reactCompiler: true,

  // Enable Cache Components (new caching model)
  cacheComponents: true,

  experimental: {
    // Enable Turbopack filesystem caching (beta)
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    // Optimize for movie posters: reduce variants to minimize optimization costs
    // Cache for 31 days (movie posters don't change)
    minimumCacheTTL: 2678400, // 31 days in seconds
    
    // Use only WebP format (good balance, reduces variants vs AVIF+WebP)
    formats: ['image/webp'],
    
    // Limit device sizes to common breakpoints (reduces unnecessary transformations)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    
    // Limit image sizes to what we actually use for movie posters
    // Based on your usage: cards (25vw-50vw), hero (300px), lists (33vw-50vw)
    imageSizes: [300, 400, 500, 600, 750, 1000],
    
    remotePatterns: [
      { hostname: 'img.clerk.com', protocol: 'https', port: '' },
      {
        hostname: 'klqkextpvzmukkmlceai.supabase.co',
        protocol: 'https',
        port: '',
      },
      {
        hostname: 'image.tmdb.org',
        protocol: 'https',
        port: '',
      },
      {
        hostname: 'a.ltrbxd.com',
        protocol: 'https',
        port: '',
      },
    ],
  },
};

export default nextConfig;
