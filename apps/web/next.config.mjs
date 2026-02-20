/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Enable top-level await to support libauth's WebAssembly and Crypto modules
    config.experiments = { 
      ...config.experiments, 
      topLevelAwait: true 
    };
    return config;
  },
};

export default nextConfig;
