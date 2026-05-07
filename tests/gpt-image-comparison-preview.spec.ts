import { expect, test } from '@playwright/test';

test('gpt image comparison preview opens and enlarges the selected image', async ({
  page,
}) => {
  test.slow();

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const showcase = page.locator('[data-slot="gpt-image-comparison-showcase"]');
  await expect(showcase).toBeVisible({ timeout: 120000 });
  await expect(showcase).toHaveAttribute('data-preview-ready', 'true', {
    timeout: 120000,
  });
  await showcase.scrollIntoViewIfNeeded();

  const trigger = page
    .locator('[data-slot="gpt-image-comparison-image-button"]')
    .first();
  await expect(trigger).toBeVisible({ timeout: 120000 });
  await expect(trigger).toHaveAttribute('data-preview-ready', 'true');
  const triggerBox = await trigger.boundingBox();

  await trigger.click();

  const dialog = page.locator('[data-slot="dialog-content"]');
  const previewFrame = page.locator(
    '[data-slot="gpt-image-comparison-preview-frame"]'
  );
  const closeButton = page.locator(
    '[data-slot="gpt-image-comparison-dialog-close"]'
  );

  await expect(dialog).toBeVisible();
  await expect(previewFrame).toBeVisible();
  await expect(closeButton).toBeVisible();

  const previewBox = await previewFrame.boundingBox();

  expect(previewBox?.width ?? 0).toBeGreaterThan(triggerBox?.width ?? 0);
  expect(previewBox?.height ?? 0).toBeGreaterThan(triggerBox?.height ?? 0);
});
