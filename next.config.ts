
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        port: '',
        pathname: '/**',
      },
      {
          protocol: 'https',
          hostname: 'grouphub-j0hsl.appspot.com',
          port: '',
          pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebaseapp.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.web.app',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Desactivamos la caché de webpack para evitar errores ENOSPC en entornos con poco espacio
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
