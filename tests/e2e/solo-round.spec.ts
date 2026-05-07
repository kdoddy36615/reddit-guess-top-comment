import { expect, test } from '@playwright/test';

/**
 * Slice 3 golden path: first-time visitor onboards with a nickname, plays the
 * sample round, sees their score and the revealed top comment.
 *
 * Prereqs: dev server is up. The test seeds a sample round via /api/dev/seed.
 *
 * Each test runs with a fresh browser context (no cookies), exercising the
 * "first-visit" path. To verify the "returning visitor" path, see
 * `solo-round-returning.spec.ts`.
 */
test('first visit: onboards then plays a round end-to-end', async ({ page, request }) => {
  const seed = await request.post('/api/dev/seed');
  expect(seed.ok()).toBe(true);
  const { roundId } = (await seed.json()) as { roundId: string };

  // Visiting a round without a player should redirect to /welcome.
  await page.goto(`/round/${roundId}`);
  await expect(page).toHaveURL(/\/welcome/);

  await page.getByLabel('Nickname').fill('e2e-tester');
  await page.getByRole('button', { name: 'Start playing' }).click();
  await expect(page).toHaveURL(new RegExp(`/round/${roundId}$`));

  // Nickname surfaces on the round page header.
  await expect(page.getByTestId('player-nickname')).toContainText('e2e-tester');

  // Spoiler-safety: top-comment text must NOT appear in the SSR HTML before guess.
  const html = await page.content();
  expect(html).not.toContain('smoke detector');
  expect(html).not.toContain('spaghetti fire');

  await page.getByLabel('Your guess').fill('the smoke detector went off');
  await page.getByRole('button', { name: 'Submit guess' }).click();

  await expect(page.getByTestId('score')).toBeVisible({ timeout: 10_000 });
  const scoreText = await page.getByTestId('score').textContent();
  expect(Number(scoreText)).toBeGreaterThanOrEqual(0);
  expect(Number(scoreText)).toBeLessThanOrEqual(100);

  await expect(page.getByTestId('top-comment')).toContainText('smoke detector');
});

test('returning visitor: cookie persists, no onboarding prompt', async ({ page, request }) => {
  const seed = await request.post('/api/dev/seed');
  expect(seed.ok()).toBe(true);
  const { roundId } = (await seed.json()) as { roundId: string };

  // First visit: onboard.
  await page.goto(`/round/${roundId}`);
  await page.getByLabel('Nickname').fill('returning-user');
  await page.getByRole('button', { name: 'Start playing' }).click();
  await expect(page).toHaveURL(new RegExp(`/round/${roundId}$`));

  // Second navigation in the same browser context: still authenticated, no prompt.
  await page.goto(`/round/${roundId}`);
  await expect(page).toHaveURL(new RegExp(`/round/${roundId}$`));
  await expect(page.getByTestId('player-nickname')).toContainText('returning-user');
});
