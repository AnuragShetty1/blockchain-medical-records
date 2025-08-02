/** @type {import('next').NextConfig} */
const nextConfig = {
  // [NEW] This 'images' section is added to solve the error.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
  },
};

export default nextConfig;
