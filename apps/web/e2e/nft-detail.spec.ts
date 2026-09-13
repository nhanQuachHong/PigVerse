import { expect, test } from "@playwright/test";

test("NFT detail shows canonical identity and honest degraded identifiers", async ({
  page,
}) => {
  await page.goto("/nft/1");
  await expect(
    page.getByRole("heading", { name: "Captain Oink", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Captain Oink" })).toBeVisible();
  await expect(page.locator(".pv-detail-page .pv-status")).toHaveCount(5);
  await expect(page.locator(".pv-detail-page .pv-status").first()).toHaveText(
    "Chưa xác định",
  );
  await expect(page.getByText("Chưa cấu hình", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".pv-detail-facts")
      .getByText("Chưa xác định", { exact: true }),
  ).toHaveCount(2);
  await expect(page.locator(".pv-detail-related .pv-nft-card")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot("nft-detail.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("NFT detail rejects IDs outside Genesis", async ({ page }) => {
  const response = await page.goto("/nft/11");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Ôi! Có điều gì đó chưa ổn." }),
  ).toBeVisible();
});
