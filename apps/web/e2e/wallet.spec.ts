import { expect, test } from "@playwright/test";

import {
  chooseInjectedWallet,
  installInjectedWallet,
  setInjectedWalletAccounts,
} from "./support/injected-wallet";

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

test("connects, reacts to account changes and disconnects in the browser", async ({
  page,
}) => {
  const firstAccount = "0x1111111111111111111111111111111111111234";
  const secondAccount = "0x2222222222222222222222222222222222225678";
  await installInjectedWallet(page, {
    account: firstAccount,
    chainId: 84532,
  });
  await page.goto("/");

  await chooseInjectedWallet(page);
  await expect(
    page.getByRole("button", { name: /0x1111…1234, Đã kết nối/u }),
  ).toBeVisible();

  await setInjectedWalletAccounts(page, [secondAccount]);
  await expect(
    page.getByRole("button", { name: /0x2222…5678, Đã kết nối/u }),
  ).toBeVisible();

  await page.getByRole("button", { name: /0x2222…5678/u }).click();
  await page.getByRole("button", { name: "Ngắt kết nối" }).click();
  await expect(page.getByRole("button", { name: "Kết nối ví" })).toBeVisible();
  expect(
    (await page.context().cookies()).some(({ name }) =>
      name.includes("pigverse-admin"),
    ),
  ).toBe(false);
});

test("keeps the browser disconnected when wallet approval is rejected", async ({
  page,
}) => {
  await installInjectedWallet(page, {
    account: "0x4444444444444444444444444444444444444321",
    chainId: 84532,
    rejectConnection: true,
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Kết nối ví" }).click();
  const dialog = page.getByRole("dialog", { name: "Chọn ví" });
  await dialog.locator(".pv-wallet-options button").first().click();

  await expect(dialog.getByRole("alert")).toContainText(
    "Không thể hoàn tất yêu cầu ví",
  );
  await expect(page.getByRole("button", { name: "Kết nối ví" })).toBeVisible();
  expect(
    (await page.context().cookies()).some(({ name }) =>
      name.includes("pigverse-admin"),
    ),
  ).toBe(false);
});

test("blocks a wrong network until the wallet switches to Base Sepolia", async ({
  page,
}) => {
  await installInjectedWallet(page, {
    account: "0x3333333333333333333333333333333333339876",
    chainId: 1,
  });
  await page.goto("/");

  await chooseInjectedWallet(page);
  await expect(page.getByRole("button", { name: "Sai mạng" })).toBeVisible();
  await page.getByRole("button", { name: "Sai mạng" }).click();
  const dialog = page.getByRole("dialog", { name: "Ví đã kết nối" });
  await expect(dialog.getByRole("alert")).toContainText("Base Sepolia");
  await page.getByRole("button", { name: "Chuyển sang Base Sepolia" }).click();

  await expect(
    page.getByRole("button", { name: /0x3333…9876, Đã kết nối/u }),
  ).toBeVisible();
  await expect(dialog.getByText("Base Sepolia", { exact: true })).toBeVisible();
});
