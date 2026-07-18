import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/downloads.html", "/whats-new.html", "/about.html"];

for (const path of PAGES) {
  test(`accessibility: ${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector(".loading-text", { state: "detached" }).catch(() => {});

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("accessibility: a software detail page has no axe violations", async ({ page }) => {
  await page.goto("/");
  await page.locator(".software-card").first().click();
  await page.waitForSelector(".skeleton-card, .software-detail-layout[aria-hidden]", { state: "detached" }).catch(() => {});

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
