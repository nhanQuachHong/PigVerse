import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("pigverse-locale", "vi"),
  );
  await page.goto("/");
  await page.locator("img").first().waitFor({ state: "visible" });
});

test("public shell has no horizontal overflow", async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

test("admin shell matches its visual baseline", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Xác minh ví quản trị", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("admin-foundation.png", {
    animations: "disabled",
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("authenticated Admin editor matches its visual baseline", async ({
  page,
}) => {
  await page.route("**/api/admin/auth/session", async (route) => {
    await route.fulfill({
      json: {
        authenticated: true,
        expiresAt: "2026-09-13T00:30:00.000Z",
        walletAddress: "0x1111111111111111111111111111111111111111",
      },
    });
  });
  await page.route("**/api/admin/content", async (route) => {
    await route.fulfill({
      json: {
        slots: Array.from({ length: 10 }, (_, index) => ({
          chainState: index === 1 ? "minted" : "unminted",
          content: null,
          tokenId: index + 1,
        })),
      },
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin Dashboard", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bản nháp 10 nhân vật", level: 2 }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".pv-admin-token-list img")
        .first()
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page).toHaveScreenshot("admin-editor.png", {
    animations: "disabled",
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("mobile navigation is keyboard-operable", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation applies only to the mobile project");
  const menu = page.locator(".pv-nav-toggle");
  await expect(menu).toHaveAccessibleName("Mở menu");
  await menu.focus();
  await menu.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
});

test("mobile admin navigation is available", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation applies only to the mobile project");
  await page.goto("/admin");
  const menu = page.locator(".pv-admin-menu-toggle");
  await expect(menu).toHaveAccessibleName("Mở điều hướng quản trị");
  await menu.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "Điều hướng quản trị" }),
  ).toBeVisible();
});
