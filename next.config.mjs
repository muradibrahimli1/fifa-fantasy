/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIFA's public JSON is fetched server-side and cached; no client-side CORS needed.
  reactStrictMode: true,
};

export default nextConfig;
