/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable rewrites in development (local)
  async rewrites() {
    // In production/Vercel, don't proxy - use Next.js API routes directly
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return []
    }
    
    // In development, proxy to Node.js server
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4005/api/:path*',
      },
    ];
  },
  
  // Vercel optimization
  experimental: {
    serverComponentsExternalPackages: ['xlsx']
  },
  
  // Ensure static file serving works properly
  trailingSlash: false,
  
  // API route timeout for Vercel
  serverRuntimeConfig: {
    maxDuration: 60
  }
}

module.exports = nextConfig 