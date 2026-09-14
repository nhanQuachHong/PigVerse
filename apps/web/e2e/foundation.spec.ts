import { expect, test } from "@playwright/test";

test("serves the browser security baseline", async ({ request }) => {
  const response = await request.get("/");

  expect(response.headers()["content-security-policy"]).toContain(
    "default-src 'self'",
  );
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["permissions-policy"]).toBe(
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("serves a redacted deployment health signal", async ({ request }) => {
  const response = await request.get("/api/health");
  const report = await response.json();

  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(report).toEqual({
    checks: {
      application: "ok",
      chain: "error",
      configuration: "error",
      database: expect.stringMatching(/^(?:error|ok)$/),
    },
    status: "degraded",
    timestamp: expect.any(String),
  });
  expect(JSON.stringify(report)).not.toMatch(/(?:postgres|rpc|token|secret)/iu);
});

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
  await page.route("**/api/admin/audit?**", async (route) => {
    await route.fulfill({
      json: {
        events: [
          {
            action: "NFT_DRAFT_UPDATED",
            actorWallet: "0x2222222222222222222222222222222222222222",
            auditEventId: "7",
            correlationId: "correlation_7",
            createdAt: "2026-09-13T00:00:07.000Z",
            safeContext: { fromRevision: 1, toRevision: 2 },
            target: { id: "7", tokenId: 5, type: "NFT_CONTENT" },
          },
        ],
        nextCursor: null,
      },
    });
  });
  await page.route("**/api/admin/mint-activity?**", async (route) => {
    const senderWallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const blockHash = `0x${"d".repeat(64)}`;
    const activity = (
      id: number,
      status: "PENDING" | "REVERTED" | "SUCCEEDED" | "UNKNOWN",
    ) => {
      const included = status === "SUCCEEDED" || status === "REVERTED";
      return {
        blockHash: included ? blockHash : null,
        blockNumber: included ? "2748" : null,
        expectedPublicationRevision: "4",
        finality: status === "SUCCEEDED" ? "included" : null,
        firstSeenAt: "2026-09-13T00:00:00.000Z",
        lastObservedAt: "2026-09-13T00:01:00.000Z",
        mintObservationId: String(id),
        observedOwnerWallet:
          status === "SUCCEEDED"
            ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            : null,
        reconciliation: status === "UNKNOWN" ? "unavailable" : "current",
        safeErrorCategory:
          status === "REVERTED"
            ? "EVM_REVERT"
            : status === "UNKNOWN"
              ? "TRANSACTION_NOT_FOUND"
              : null,
        senderWallet,
        status,
        tokenId: id,
        transactionHash: `0x${String(id).repeat(64)}`,
        transferLogIndex: status === "SUCCEEDED" ? 7 : null,
      };
    };
    await route.fulfill({
      json: {
        activities: [
          activity(1, "SUCCEEDED"),
          activity(2, "REVERTED"),
          activity(3, "PENDING"),
          activity(4, "UNKNOWN"),
        ],
        nextCursor: null,
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
  await expect(
    page.getByRole("heading", { name: "Lịch sử thay đổi", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hoạt động mint", level: 2 }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
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
