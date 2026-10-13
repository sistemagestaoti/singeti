/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
