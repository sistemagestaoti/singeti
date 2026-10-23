/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    agentUpgrade: 'security',
  },
  outputFileTracingIncludes: {
    '/**': ['./prisma/sqlite.db', './sqlite.db'],
  },
  async redirects() {
    return [
      {
        source: '/usuarios',
        destination: '/users',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
