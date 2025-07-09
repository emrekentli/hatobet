/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Build sırasında ESLint hatalarını görmezden gel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Build sırasında TypeScript type check'lerini görmezden gel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
