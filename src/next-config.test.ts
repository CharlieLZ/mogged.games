import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('next config redirects', () => {
  it('keeps default-locale canonicalization on the Cloudflare-compatible middleware entrypoint', async () => {
    const { default: nextConfig } = await import('../next.config.mjs');
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(
      redirects.filter(
        (redirect) =>
          typeof redirect.source === 'string' &&
          redirect.source.startsWith('/en')
      )
    ).toHaveLength(0);

    expect(redirects).toContainEqual(
      expect.objectContaining({
        source: '/:path*',
        has: [{ type: 'host', value: 'www.mogged.games' }],
        destination: 'https://mogged.games/:path*',
        permanent: true,
      })
    );
    const middlewarePath = join(process.cwd(), 'src/middleware.ts');
    const proxyPath = join(process.cwd(), 'src/proxy.ts');

    expect(existsSync(middlewarePath)).toBe(true);
    expect(existsSync(proxyPath)).toBe(false);
  });

  it('keeps image generator routes out of next.config redirects so they stay first-class pages', async () => {
    const { default: nextConfig } = await import('../next.config.mjs');
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(
      redirects.some(
        (redirect) =>
          redirect.source === '/ai-image-generator' ||
          redirect.source === '/ai-image-generator/:path*'
      )
    ).toBe(false);
  });

  it('keeps localized image generator routes out of next.config redirects as well', async () => {
    const { default: nextConfig } = await import('../next.config.mjs');
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(
      redirects.some(
        (redirect) =>
          redirect.source ===
            '/:locale(zh|de|fr|es|ja|it|ko|ar)/ai-image-generator' ||
          redirect.source ===
            '/:locale(zh|de|fr|es|ja|it|ko|ar)/ai-image-generator/:path*'
      )
    ).toBe(false);
  });

  it('allows only the active homepage remote image hosts', async () => {
    const { default: nextConfig } = await import('../next.config.mjs');
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];
    const hostnames = remotePatterns.map((pattern) => pattern.hostname);

    expect(hostnames).toEqual([
      'pub-49364ecf52e344d3a722a3c5bca11271.r2.dev',
      'pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev',
    ]);
  });

  it('keeps certificate route tracing free of embedded font payloads', async () => {
    const { default: nextConfig } = await import('../next.config.mjs');
    const tracedFiles =
      nextConfig.outputFileTracingIncludes?.['/api/certificate/download'] ?? [];

    expect(tracedFiles).toEqual(['./src/config/style/theme.css']);
    expect(
      tracedFiles.some(
        (entry) => entry.includes('fonts/') || entry.includes('@fontsource')
      )
    ).toBe(false);
  });

  it('keeps OpenNext Cloudflare dev bindings opt-in for plain next dev', async () => {
    const { shouldInitOpenNextCloudflareForDev } =
      await import('../next.config.mjs');
    const originalOpenNextDev = process.env.OPENNEXT_CLOUDFLARE_DEV;
    const originalWranglerEnv = process.env.NEXT_DEV_WRANGLER_ENV;

    try {
      delete process.env.OPENNEXT_CLOUDFLARE_DEV;
      delete process.env.NEXT_DEV_WRANGLER_ENV;
      expect(shouldInitOpenNextCloudflareForDev()).toBe(false);

      process.env.OPENNEXT_CLOUDFLARE_DEV = 'true';
      expect(shouldInitOpenNextCloudflareForDev()).toBe(true);

      delete process.env.OPENNEXT_CLOUDFLARE_DEV;
      process.env.NEXT_DEV_WRANGLER_ENV = 'preview';
      expect(shouldInitOpenNextCloudflareForDev()).toBe(true);
    } finally {
      if (originalOpenNextDev === undefined) {
        delete process.env.OPENNEXT_CLOUDFLARE_DEV;
      } else {
        process.env.OPENNEXT_CLOUDFLARE_DEV = originalOpenNextDev;
      }

      if (originalWranglerEnv === undefined) {
        delete process.env.NEXT_DEV_WRANGLER_ENV;
      } else {
        process.env.NEXT_DEV_WRANGLER_ENV = originalWranglerEnv;
      }
    }
  });
});
