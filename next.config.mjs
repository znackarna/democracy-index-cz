/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — Vercel hosts the contents of out/ as static files.
  // No SSR, no runtime API routes, no server-side env vars.
  output: 'export',
  // Trailing slash makes file:// previews work without a server.
  trailingSlash: true,
  images: {
    // Static export doesn't run the Next image optimizer at runtime.
    unoptimized: true,
  },
  typedRoutes: true,
};

export default nextConfig;
