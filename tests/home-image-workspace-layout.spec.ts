import { expect, test, type Page } from '@playwright/test';

const HOME_HERO_VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 2048, height: 1152 },
] as const;

const TALL_DESKTOP_HOME_VIEWPORT = { width: 2048, height: 1152 } as const;

async function measureWorkspace(page: Page) {
  const formCard = page.locator('[data-slot="image-workspace-form-card"]');
  const generateButton = page.getByRole('button', {
    name: /generate image/i,
  });

  await expect(formCard).toBeVisible();
  await expect(generateButton).toBeVisible();

  const formCardBox = await formCard.boundingBox();
  const buttonBox = await generateButton.boundingBox();

  expect(formCardBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  return {
    formCardHeight: formCardBox!.height,
    generateButtonBottom: buttonBox!.y + buttonBox!.height,
  };
}

for (const viewport of HOME_HERO_VIEWPORTS) {
  test(`homepage Generate Image action is visible in the first viewport at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const generateButton = page.getByRole('button', {
      name: /generate image/i,
    });
    await expect(generateButton).toBeVisible();

    const buttonBox = await generateButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.y).toBeGreaterThanOrEqual(0);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(
      viewport.height
    );
  });
}

test('homepage Generate Image action tracks generator-page lower placement on tall desktop', async ({
  page,
}) => {
  await page.setViewportSize(TALL_DESKTOP_HOME_VIEWPORT);

  await page.goto('/ai-image-generator');
  const generatorPage = await measureWorkspace(page);

  await page.goto('/');
  const homePage = await measureWorkspace(page);

  expect(homePage.formCardHeight).toBeGreaterThanOrEqual(
    generatorPage.formCardHeight - 16
  );
  expect(
    Math.abs(homePage.generateButtonBottom - generatorPage.generateButtonBottom)
  ).toBeLessThanOrEqual(24);
  expect(homePage.generateButtonBottom).toBeLessThanOrEqual(
    TALL_DESKTOP_HOME_VIEWPORT.height
  );
});
