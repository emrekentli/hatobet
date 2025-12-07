/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Build sırasında TypeScript type check'lerini görmezden gel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
