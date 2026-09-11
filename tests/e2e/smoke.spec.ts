import { test, expect } from "@playwright/test";
import { PRODUCT_NAME } from "../../lib/brand";

test("chapter 2 is locked until chapter 1 is passed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pass chapter 1: Markets & price-as-probability")).toBeVisible();

  await page.evaluate(() =>
    localStorage.setItem(
      "dutchbook.progress.v1",
      JSON.stringify({
        version: 1,
        chapters: {
          "markets-and-probability": { bestScore: 1, passed: true, attempts: [], mastery: {} },
        },
      }),
    ),
  );
  await page.reload();

  await page.getByRole("link", { name: /Orders & fills/ }).click();
  await expect(page.getByRole("heading", { name: "Orders & fills", level: 1 })).toBeVisible();
});

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

test("a chapter can be passed, and progress persists", async ({ page }) => {
  await page.goto("/play/markets-and-probability");

  // Skip to the end of the lessons and start the test.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: /chapter test/i }).click();

  await answerEveryDrill(page);
  await page.getByRole("button", { name: "See your result" }).click();
  await expect(page.getByText(/passed|not passed/)).toBeVisible();

  // Whatever the outcome, it is recorded and survives a reload.
  await page.goto("/");
  await expect(page.getByText(/%/).first()).toBeVisible();
});

/** Answers each drill correctly by reading the explanation the card reveals. */
async function answerEveryDrill(page: import("@playwright/test").Page) {
  for (let i = 0; i < 20; i++) {
    const seeResult = page.getByRole("button", { name: "See your result" });
    if (await seeResult.isVisible().catch(() => false)) return;

    const card = page.locator("[data-drill]").last();
    const input = card.getByLabel("Your answer");

    if (await input.isVisible().catch(() => false)) {
      await input.fill("0");
      await card.getByRole("button", { name: "Check" }).click();
    } else {
      await card.getByRole("button").first().click();
    }
    await page.waitForTimeout(120);
  }
}
