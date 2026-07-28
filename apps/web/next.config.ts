import type { NextConfig } from 'next';

type WebpackConfiguration = {
  externals: unknown[];
  resolve: {
    extensionAlias?: Record<string, string[]>;
  };
};

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  transpilePackages: [
    '@suitly/api',
    '@suitly/ai',
    '@suitly/core',
    '@suitly/recommendation',
    '@suitly/shopper-photo',
  ],
  webpack(config: WebpackConfiguration) {
    config.externals.push({ sharp: 'commonjs sharp' });
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
