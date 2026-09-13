import { expect, test } from "@playwright/test";

test("My NFTs requires a connected wallet without showing false ownership", async ({
  page,
}) => {
  await page.goto("/my-nfts");

  await expect(
    page.getByRole("heading", { name: "NFT của tôi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kết nối ví của bạn" }),
  ).toBeVisible();
  await expect(page.getByText(/NFT đang sở hữu/)).toHaveCount(0);
  await expect(page).toHaveScreenshot("my-nfts-disconnected.png", {
    animations: "disabled",
    fullPage: true,
  });

  await page
    .locator("#main-content")
    .getByRole("button", { name: "Kết nối ví", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Chọn ví" })).toBeVisible();
});
