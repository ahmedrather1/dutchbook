import { test, expect, type Page } from "@playwright/test";

// A full suite run is hundreds of worker round trips.
test.setTimeout(120_000);

/**
 * The sandbox's guarantees (D28). These cannot be unit-tested: they depend on a real
 * Worker, so they are asserted against a real browser.
 */

async function openLab(page: Page) {
  await page.goto("/play/capstone");
  const next = page.getByRole("button", { name: "Next →" });
  while (await next.isEnabled()) await next.click();
  await expect(page.getByLabel("Strategy code")).toBeVisible();
}

async function runCode(page: Page, code: string) {
  await page.getByLabel("Strategy code").fill(code);
  await page.getByRole("button", { name: /Run against the suite/ }).click();
}

test("an infinite loop is stopped without freezing the page", async ({ page }) => {
  await openLab(page);
  await runCode(page, `function onTick(ctx) { while (true) {} }`);

  // The watchdog terminates the worker; the page must still respond.
  await expect(page.getByText(/Your code threw in \d+ run/)).toBeVisible({ timeout: 60000 });
  await page.getByText("Per scenario", { exact: true }).click();
  await expect(page.getByText(/ran longer than \d+ms and was stopped/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeEnabled();
});

test("a thrown error is reported, not swallowed", async ({ page }) => {
  await openLab(page);
  await runCode(page, `function onTick(ctx) { throw new Error("deliberate"); }`);
  await expect(page.getByText(/deliberate/)).toBeVisible({ timeout: 30000 });
});

test("code that does not define onTick is rejected with a reason", async ({ page }) => {
  await openLab(page);
  await runCode(page, `const x = 1;`);
  await expect(page.getByText(/No function named onTick/)).toBeVisible({ timeout: 20000 });
});

test("the network and the page are unreachable from player code", async ({ page }) => {
  await openLab(page);
  // Reported through the console rather than thrown, so the assertion cannot accidentally
  // match the test's own source sitting in the editor.
  await runCode(
    page,
    `function onTick(ctx) {
       if (ctx.tick === 1) {
         ctx.log("net:" + typeof fetch + "," + typeof XMLHttpRequest + "," + typeof WebSocket);
         ctx.log("page:" + typeof self + "," + typeof globalThis + "," + typeof importScripts);
       }
       return { type: "hold" };
     }`,
  );

  await expect(page.getByText(/passed|not passed/).first()).toBeVisible({ timeout: 100000 });
  const console_ = await page.getByText("Console").locator("..").innerText();
  expect(console_).toContain("net:undefined,undefined,undefined");
  expect(console_).toContain("page:undefined,undefined,undefined");
});

test("a working strategy runs and reports a breakdown", async ({ page }) => {
  await openLab(page);
  await runCode(
    page,
    `function onTick(ctx) {
       if (ctx.tick === 5) return { type: "buy", qty: 2 };
       if (ctx.ticksRemaining === 5 && ctx.account.position > 0) {
         return { type: "sell", qty: ctx.account.position };
       }
       return { type: "hold" };
     }`,
  );
  await expect(page.getByText(/passed|not passed/).first()).toBeVisible({ timeout: 100000 });
  await expect(page.getByText("Trades", { exact: true })).toBeVisible();
});
