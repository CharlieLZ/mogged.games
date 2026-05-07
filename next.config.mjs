/* eslint-env node */
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

const streamdownEsmEntry = fileURLToPath(
  new URL('./node_modules/streamdown/dist/index.js', import.meta.url)
);
const outputFileTracingRoot = fileURLToPath(new URL('.', import.meta.url));

export function shouldInitOpenNextCloudflareForDev() {
  return (
    process.env.OPENNEXT_CLOUDFLARE_DEV === 'true' ||
    process.env.OPENNEXT_CLOUDFLARE_DEV === '1' ||
    Boolean(process.env.NEXT_DEV_WRANGLER_ENV)
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  outputFileTracingRoot,
  reactStrictMode: false,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-49364ecf52e344d3a722a3c5bca11271.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev',
      },
    ],
  },
  outputFileTracingIncludes: {
    '/api/certificate/download': ['./src/config/style/theme.css'],
  },
  async redirects() {
    return [
      // www → 非www 统一域名（避免重复索引）
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.mogged.games' }],
        destination: 'https://mogged.games/:path*',
        permanent: true,
      },
      // 默认语言前缀统一交给 Edge middleware 做 308 归一化；Cloudflare Workers/OpenNext 当前不支持 Next 16 Node Proxy
    ];
  },
  // 为静态资源添加 noindex 头部，明确告诉搜索引擎不要索引技术文件
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      // 阻止索引所有 _next 路径（包括 CSS、JS 等静态资源）
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      // 阻止索引 favicon
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      // 阻止索引 API 路由
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      // Turbopack 默认构建链路也要命中 streamdown 的 ESM 入口，避免回退到 CJS 去 require ESM-only 的 shiki
      streamdown: streamdownEsmEntry,
    },
  },
  experimental: {
    // Turbopack 的文件系统缓存在本地会写 SST，近期频繁报 ENOENT 直接崩；关掉走内存缓存更稳
    turbopackFileSystemCacheForDev: false,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // 兼容显式 webpack 构建时的同一条 streamdown 入口策略
      streamdown: streamdownEsmEntry,
    };

    return config;
  },
  reactCompiler: true,
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));

if (shouldInitOpenNextCloudflareForDev()) {
  const { initOpenNextCloudflareForDev } = await import(
    '@opennextjs/cloudflare'
  );
  initOpenNextCloudflareForDev();
}
