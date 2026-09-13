import { expect, test } from "@playwright/test";

test("Story preserves the bilingual approval boundary", async ({ page }) => {
  await page.goto("/story");

  await expect(
    page.getByRole("heading", { name: "Câu chuyện Pigverse" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "không xuất bản nội dung tạm như canon",
  );
  await expect(page).toHaveScreenshot("story.png", {
    animations: "disabled",
    fullPage: true,
  });

  if (test.info().project.name === "mobile-chromium") {
    await page.getByRole("button", { name: "Mở menu" }).click();
    await page
      .locator(".pv-public-nav__locale")
      .getByRole("button", { name: "EN" })
      .click();
  } else {
    await page
      .locator(".pv-locale-switcher")
      .getByRole("button", { name: "EN" })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "The Pigverse Story" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "does not publish placeholder copy as canon",
  );
});
