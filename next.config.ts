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
