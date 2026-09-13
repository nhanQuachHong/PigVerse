import { expect, test } from "@playwright/test";

test("wallet entry point explains the non-custodial connection boundary", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kết nối ví" }).click();

  await expect(page.getByRole("dialog", { name: "Chọn ví" })).toBeVisible();
  await expect(
    page.getByText(/không bao giờ yêu cầu private key hoặc seed phrase/i),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("wallet-connect.png", {
    animations: "disabled",
    fullPage: true,
  });
});
