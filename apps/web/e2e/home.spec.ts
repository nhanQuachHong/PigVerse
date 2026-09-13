import { expect, test } from "@playwright/test";

test("home presents Pigverse, featured characters and honest Genesis progress", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Gặp gỡ 10 chú heo Pigverse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Khám phá bộ sưu tập" }),
  ).toBeVisible();
  await expect(page.locator(".pv-home-featured .pv-nft-card")).toHaveCount(4);
  await expect(page.locator(".pv-home-token-strip a")).toHaveCount(10);
  await expect(page.getByText("— / 10 đã mint")).toBeVisible();
  await expect(
    page.getByText("Chưa xác minh được trạng thái on-chain."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot("home.png", {
    animations: "disabled",
    fullPage: true,
  });
  const menuButton = page.getByRole("button", { name: "Mở menu" });
  const hasMobileMenu = await menuButton.isVisible();
  if (hasMobileMenu) await menuButton.click();
  const localeGroup = hasMobileMenu
    ? page.locator(".pv-public-nav__locale")
    : page.locator(".pv-locale-switcher");
  await localeGroup.getByRole("button", { name: "EN" }).click();
  await expect(localeGroup.getByRole("button", { name: "EN" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Meet the 10 Pigs of Pigverse" }),
  ).toBeVisible();
});
