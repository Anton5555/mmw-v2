import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  /* config options here */
};

export default nextConfig;
