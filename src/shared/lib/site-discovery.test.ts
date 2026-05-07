import { describe, expect, it } from 'vitest';

import { getPublicPageLastModified } from '@/config/website/public-page-metadata';

import { getAppUrl } from './brand';
import {
  DISCOVERABLE_SINGLE_SEGMENT_SLUGS,
  isDiscoverablePublicPath,
} from './discoverable-pages';
import {
  buildLlmsText,
  getSiteRobotsConfig,
  getSiteSitemap,
} from './site-discovery';

function hasUserAgent(
  userAgent: string | string[] | undefined,
  target: string
): boolean {
  if (!userAgent) {
    return false;
  }

  return Array.isArray(userAgent)
    ? userAgent.includes(target)
    : userAgent === target;
}

describe('site discovery', () => {
  const appUrl = getAppUrl();

  it('builds llms.txt with the required sections and curated links', () => {
    const llms = buildLlmsText();

    expect(llms.startsWith('# mogged')).toBe(true);
    expect(llms).toContain('## Core Pages');
    expect(llms).toContain('## Public Workflows');
    expect(llms).toContain('## Browser Tools');
    expect(llms).toContain('## Policies');
    expect(llms).toContain('## Discovery Endpoints');
    expect(llms).toContain(`${appUrl}/llm.txt`);
    expect(llms).toContain(`${appUrl}/llms-full.txt`);
    expect(llms).toContain(`${appUrl}/pricing`);
    expect(llms).toContain(`${appUrl}/ai-video-generator`);
    expect(llms).toContain(`${appUrl}/ai-video-generator?mode=text-to-video`);
    expect(llms).toContain(`${appUrl}/ai-image-generator?mode=text-to-image`);
    expect(llms).toContain(`${appUrl}/ai-image-generator?mode=image-to-image`);
    expect(llms).toContain(`${appUrl}/mission`);
    expect(llms).not.toContain(`${appUrl}/acceptable-use-policy`);
    expect(llms).not.toContain(`${appUrl}/content-moderation-policy`);
    expect(llms).not.toContain(`${appUrl}/ai-wrapper-disclaimer`);
  });

  it('keeps public discovery copy aligned with mogged branding', () => {
    const llms = buildLlmsText({ full: true });

    expect(llms).toContain('Describe the public product as mogged');
    expect(llms).toContain('repo name `mogged.games`');
    expect(llms).toContain('Historical blog or legacy image-first public content');
    expect(llms).toContain('public AI image editor');
    expect(llms).toContain('AI image editor workspace');
    expect(llms).toContain('Seedance 2.0');
    expect(llms).toContain('/ai-image-generator');
    expect(llms).toContain('/ai-video-generator');
  });

  it('builds llms-full.txt with operational guidance and localized links', () => {
    const llmsFull = buildLlmsText({ full: true });

    expect(llmsFull).toContain(
      'not the official website for any third-party model vendor'
    );
    expect(llmsFull).toContain(
      'describe pricing and subscriptions as services sold'
    );
    expect(llmsFull).toContain(`${appUrl}/llm.txt`);
    expect(llmsFull).toContain(`${appUrl}/ai-image-generator?mode=text-to-image`);
    expect(llmsFull).toContain(
      `${appUrl}/ai-image-generator?mode=image-to-image`
    );
    expect(llmsFull).toContain(`${appUrl}/zh/pricing`);
    expect(llmsFull).toContain(`${appUrl}/zh/acceptable-use-policy`);
    expect(llmsFull).toContain(`${appUrl}/zh/content-moderation-policy`);
    expect(llmsFull).toContain(`${appUrl}/zh/ai-wrapper-disclaimer`);
    expect(llmsFull).toContain(`${appUrl}/de/pricing`);
    expect(llmsFull).toContain(`${appUrl}/fr/pricing`);
    expect(llmsFull).toContain(`${appUrl}/es/pricing`);
    expect(llmsFull).toContain(`${appUrl}/ja/pricing`);
    expect(llmsFull).toContain(`${appUrl}/it/pricing`);
    expect(llmsFull).toContain(`${appUrl}/ko/pricing`);
    expect(llmsFull).toContain(`${appUrl}/ar/pricing`);
    expect(llmsFull).toContain(`${appUrl}/zh/ai-image-generator`);
    expect(llmsFull).toContain(`${appUrl}/zh/ai-video-generator`);
  });

  it('separates search bots from training bots in robots config', () => {
    const robots = getSiteRobotsConfig();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];

    const openAiSearchRule = rules.find((rule) =>
      hasUserAgent(rule.userAgent, 'OAI-SearchBot')
    );
    const googlebotRule = rules.find((rule) =>
      hasUserAgent(rule.userAgent, 'Googlebot')
    );
    const claudeSearchRule = rules.find((rule) =>
      hasUserAgent(rule.userAgent, 'Claude-SearchBot')
    );
    const gptBotRule = rules.find((rule) =>
      hasUserAgent(rule.userAgent, 'GPTBot')
    );
    const anthropicAliasRule = rules.find((rule) =>
      hasUserAgent(rule.userAgent, 'Anthropic-AI')
    );

    expect(openAiSearchRule).toBeDefined();
    expect(openAiSearchRule?.allow).toEqual(
      expect.arrayContaining(['/llms.txt', '/llms-full.txt', '/'])
    );
    expect(googlebotRule).toBeDefined();
    expect(googlebotRule?.disallow).toEqual(
      expect.arrayContaining(['/api/*', '/404', '/500'])
    );
    expect(claudeSearchRule).toBeDefined();
    expect(claudeSearchRule?.allow).toEqual(
      expect.arrayContaining(['/llm.txt', '/llms.txt', '/llms-full.txt', '/'])
    );
    expect(gptBotRule?.allow).toEqual(
      expect.arrayContaining(['/llm.txt', '/llms.txt', '/llms-full.txt'])
    );
    expect(gptBotRule?.disallow).toEqual(['/']);
    expect(anthropicAliasRule).toBeDefined();
    expect(anthropicAliasRule?.disallow).toEqual(['/']);
  });

  it('builds a localized sitemap for all public pages', () => {
    const sitemap = getSiteSitemap();

    expect(sitemap.some((entry) => entry.url === appUrl)).toBe(true);
    expect(sitemap.some((entry) => entry.url === `${appUrl}/zh`)).toBe(true);
    expect(sitemap.some((entry) => entry.url === `${appUrl}/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/blog`)).toBe(false);
    expect(sitemap.some((entry) => entry.url.includes('/blog/'))).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/ai-video-generator`)
    ).toBe(true);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/ai-video-generator/text-to-video`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/ai-video-generator/image-to-video`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) =>
          entry.url === `${appUrl}/ai-video-generator/reference-to-video`
      )
    ).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/ai-image-generator`)
    ).toBe(true);
    expect(
      sitemap.some((entry) =>
        entry.url.includes('/ai-image-generator/text-to-image')
      )
    ).toBe(false);
    expect(
      sitemap.some((entry) =>
        entry.url.includes('/ai-image-generator/image-to-image')
      )
    ).toBe(false);
    expect(sitemap.some((entry) => entry.url === `${appUrl}/free-tools`)).toBe(
      false
    );
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/free-tools/image-cropper`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/free-tools/image-resizer`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/free-tools/image-upscaler`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/free-tools/image-rotator`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/free-tools/image-metadata-remover`
      )
    ).toBe(false);
    expect(sitemap.some((entry) => entry.url === `${appUrl}/zh/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/de/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/fr/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/es/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/ja/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/it/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/ko/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/ar/pricing`)).toBe(
      true
    );
    expect(sitemap.some((entry) => entry.url === `${appUrl}/mission`)).toBe(
      true
    );
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/privacy-policy`)
    ).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/terms-of-service`)
    ).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/refund-policy`)
    ).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/acceptable-use-policy`)
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/content-moderation-policy`
      )
    ).toBe(false);
    expect(
      sitemap.some((entry) => entry.url === `${appUrl}/ai-wrapper-disclaimer`)
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/zh/acceptable-use-policy`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/de/acceptable-use-policy`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/it/acceptable-use-policy`
      )
    ).toBe(false);
    expect(
      sitemap.some(
        (entry) => entry.url === `${appUrl}/ar/acceptable-use-policy`
      )
    ).toBe(false);
    expect(sitemap.every((entry) => entry.lastModified instanceof Date)).toBe(
      true
    );
    expect(getPublicPageLastModified('/').toISOString()).toBe(
      '2026-05-05T00:00:00.000Z'
    );
    expect(getPublicPageLastModified('/pricing').toISOString()).toBe(
      '2026-05-05T00:00:00.000Z'
    );
    expect(getPublicPageLastModified('/ai-image-generator').toISOString()).toBe(
      '2026-05-05T00:00:00.000Z'
    );
    expect(getPublicPageLastModified('/ai-video-generator').toISOString()).toBe(
      '2026-05-05T00:00:00.000Z'
    );
    expect(
      getPublicPageLastModified('/acceptable-use-policy').toISOString()
    ).toBe('2026-05-05T00:00:00.000Z');
    expect(
      getPublicPageLastModified('/content-moderation-policy').toISOString()
    ).toBe('2026-04-12T00:00:00.000Z');
    expect(
      getPublicPageLastModified('/ai-wrapper-disclaimer').toISOString()
    ).toBe('2026-04-12T00:00:00.000Z');
  });

  it('keeps public single-segment paths aligned for proxy noindex decisions', () => {
    expect(DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('mission')).toBe(true);
    expect(DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('pricing')).toBe(true);
    expect(
      DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('acceptable-use-policy')
    ).toBe(false);
    expect(
      DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('content-moderation-policy')
    ).toBe(false);
    expect(
      DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('ai-wrapper-disclaimer')
    ).toBe(false);
    expect(DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('blog')).toBe(false);
    expect(DISCOVERABLE_SINGLE_SEGMENT_SLUGS.has('free-tools')).toBe(false);

    expect(isDiscoverablePublicPath('/mission')).toBe(true);
    expect(isDiscoverablePublicPath('terms-of-service')).toBe(false);
    expect(isDiscoverablePublicPath('/acceptable-use-policy')).toBe(false);
    expect(isDiscoverablePublicPath('/content-moderation-policy')).toBe(false);
    expect(isDiscoverablePublicPath('/ai-wrapper-disclaimer')).toBe(false);
    expect(isDiscoverablePublicPath('/free-tools')).toBe(false);
    expect(isDiscoverablePublicPath('/free-tools/image-cropper')).toBe(false);
    expect(isDiscoverablePublicPath('/blog/seedance-2-0-notes')).toBe(false);
    expect(isDiscoverablePublicPath('/blog')).toBe(false);
  });
});
