import { expect, test } from "@playwright/test";

test("collection renders canonical identities and honest unknown states", async ({
  page,
}) => {
  await page.goto("/collection");
  await expect(page.locator(".pv-nft-card")).toHaveCount(10);
  await expect(
    page.getByRole("heading", { name: "Captain Oink" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".pv-nft-card img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot("collection.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Có thể mint", exact: true }).click();
  await expect(page.locator(".pv-nft-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(page.locator(".pv-nft-card")).toHaveCount(10);
});
