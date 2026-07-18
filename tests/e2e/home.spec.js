import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and lists software", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".software-card").first()).toBeVisible();
  });

  test("search filters the software list", async ({ page }) => {
    await page.goto("/");
    const cardsBefore = await page.locator(".software-card").count();
    expect(cardsBefore).toBeGreaterThan(0);

    const firstName = await page.locator(".software-card-title").first().textContent();
    await page.fill("#catalog-search", firstName.trim());

    await expect(page.locator(".software-card")).toHaveCount(1);
    await expect(page.locator(".software-card-title").first()).toHaveText(firstName.trim());
  });

  test("search with no match shows the empty state", async ({ page }) => {
    await page.goto("/");
    await page.fill("#catalog-search", "this-software-does-not-exist-xyz");
    await expect(page.locator(".empty-state-title")).toBeVisible();
  });

  test("sort select reorders the grid", async ({ page }) => {
    await page.goto("/");
    const titlesBefore = await page.locator(".software-card-title").allTextContents();

    await page.selectOption("#catalog-sort", "name");
    const titlesAfterNameSort = await page.locator(".software-card-title").allTextContents();
    const expectedAlphabetical = [...titlesBefore].sort((a, b) => a.localeCompare(b));
    expect(titlesAfterNameSort).toEqual(expectedAlphabetical);
  });

  test("pressing / focuses the search field", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("/");
    await expect(page.locator("#catalog-search")).toBeFocused();
  });
});
