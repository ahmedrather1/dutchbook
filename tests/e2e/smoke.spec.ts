import { test, expect } from "@playwright/test";
import { PRODUCT_NAME } from "../../lib/brand";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
});
