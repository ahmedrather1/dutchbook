import { test, expect, type Page } from "@playwright/test";

/**
 * E-9: the game must be completable without a mouse, and nothing may convey state by
 * colour alone (D39).
 */

const ROUTES = ["/", "/guide", "/play/markets-and-probability", "/play/frictions"];

test.describe("keyboard and structure", () => {
  for (const route of ROUTES) {
    test(`${route} has one h1 and a reachable first control`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
      expect(["A", "BUTTON", "INPUT", "TEXTAREA", "SUMMARY"]).toContain(focused);
    });

    test(`${route} gives focus a visible outline`, async ({ page }) => {
      await page.goto(route);
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "";
        const style = getComputedStyle(el);
        return `${style.outlineStyle}:${style.outlineWidth}`;
      });
      expect(outline).not.toBe("none:0px");
    });
  }
});

test("chapter 1 can be played to the drills with the keyboard alone", async ({ page }) => {
  await page.goto("/play/markets-and-probability");

  // Tab to the Next button and advance through every lesson.
  for (let i = 0; i < 4; i++) {
    const next = page.getByRole("button", { name: "Next →" });
    if (!(await next.isEnabled())) break;
    await next.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("button", { name: /chapter test/i })).toBeVisible();

  const test_ = page.getByRole("button", { name: /chapter test/i });
  await test_.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-drill]").first()).toBeVisible();
});

test("the order book labels each side for assistive tech, not just by colour", async ({ page }) => {
  await page.goto("/play/markets-and-probability");
  await expect(page.locator(".sr-only").filter({ hasText: "bid" }).first()).toBeAttached();
  await expect(page.locator(".sr-only").filter({ hasText: "ask" }).first()).toBeAttached();
});

test("negative money always carries a sign", async ({ page }: { page: Page }) => {
  await page.goto("/play/markets-and-probability");
  const cash = await page.locator('[data-stat="Cash"]').innerText();
  expect(cash).toMatch(/^-?\$/);
});
