import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    // Avoid dev file-watch flapping
    if (dev) {
      config.watchOptions = {
        ignored: ['**/*'],
      };
    }
    // Alias optional native-only deps used by wallet libraries
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      // Add alias for x402 local stubs to satisfy @x402-sovereign/core imports
      'x402': path.resolve(__dirname, 'src/x402'),
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;