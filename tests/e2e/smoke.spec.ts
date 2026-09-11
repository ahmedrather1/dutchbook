import { test, expect } from "@playwright/test";
import { PRODUCT_NAME } from "../../lib/brand";

test("landing lists the twelve chapters", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(12);
});

test("chapter 1 runs a live market and fills a buy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Markets & price-as-probability/ }).click();

  await expect(page.getByRole("heading", { name: "Markets & price-as-probability" })).toBeVisible();
  await expect(page.getByText("spread", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Start market" }).click();
  await expect
    .poll(() => stat(page, "Tick"), { timeout: 5000 })
    .toBeGreaterThan(3);

  await page.getByRole("button", { name: "Buy 10" }).click();
  await expect.poll(() => stat(page, "Position")).toBe(10);
});

async function stat(page: import("@playwright/test").Page, label: string) {
  return Number(await page.locator(`[data-stat="${label}"]`).innerText());
}
