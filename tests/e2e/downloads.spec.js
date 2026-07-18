import { test, expect } from "@playwright/test";

test.describe("Downloads page", () => {
  test("lists software with a download link per row", async ({ page }) => {
    await page.goto("/downloads.html");
    const rows = page.locator("#downloads-table tbody tr");
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().locator("a", { hasText: "Download" })).toBeVisible();
  });

  test("search narrows down the table", async ({ page }) => {
    await page.goto("/downloads.html");
    const rowCountBefore = await page.locator("#downloads-table tbody tr").count();
    expect(rowCountBefore).toBeGreaterThan(0);

    await page.fill("#catalog-search", "this-software-does-not-exist-xyz");
    await expect(page.locator("#downloads-table .empty-state-title")).toBeVisible();
  });
});
