import { test, expect } from "@playwright/test";

test.describe("Software detail page", () => {
  test("navigating from a card opens the matching detail page", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator(".software-card").first();
    const name = (await firstCard.locator(".software-card-title").textContent()).trim();
    await firstCard.click();

    await expect(page).toHaveURL(/software\.html\?id=/);
    await expect(page.locator("h1")).toHaveText(name);
    await expect(page.locator("[data-download-button]")).toBeVisible();
  });

  test("clicking download shows the preparing/started sequence", async ({ page }) => {
    await page.goto("/");
    await page.locator(".software-card").first().click();

    const button = page.locator("[data-download-button]");
    await button.click();
    await expect(button.locator(".download-button-label")).toHaveText("Preparing download...");
  });

  test("unknown software id shows a not-found state", async ({ page }) => {
    await page.goto("/software.html?id=does-not-exist");
    await expect(page.locator(".empty-state-title")).toHaveText("Software not found");
  });
});
