/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@axon-ryzr/shared'],
  images: {
    // Assets are served from MinIO (public URL or presigned). Allow any host
    // since the campus deployment endpoint is configurable.
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
