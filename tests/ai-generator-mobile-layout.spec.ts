import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});

const AI_GENERATOR_MODES = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
] as const;

for (const mode of AI_GENERATOR_MODES) {
  test(`${mode} keeps the generator section below the hero on mobile`, async ({
    page,
  }) => {
    await page.goto(`/ai-video-generator/${mode}`);

    const sections = page.locator('main > section');
    const heroSection = sections.nth(0);
    const generatorSection = sections.nth(1);
    await expect(heroSection).toBeVisible();
    await expect(generatorSection).toBeVisible();
    const heroBox = await heroSection.boundingBox();
    const generatorBox = await generatorSection.boundingBox();

    expect(heroBox).not.toBeNull();
    expect(generatorBox).not.toBeNull();
    expect(generatorBox!.y).toBeGreaterThanOrEqual(
      heroBox!.y + heroBox!.height - 1
    );
  });
}

test('mobile promo banner copy stays within its available lane', async ({
  page,
}) => {
  await page.goto('/ai-video-generator/image-to-video');

  const mobileCopyRow = page.locator('[data-slot="promo-banner-mobile-copy"] > div');
  await expect(mobileCopyRow).toBeVisible();

  const overflowWidth = await mobileCopyRow.evaluate(
    (node) => node.scrollWidth - node.clientWidth
  );

  expect(overflowWidth).toBeLessThanOrEqual(1);
});
