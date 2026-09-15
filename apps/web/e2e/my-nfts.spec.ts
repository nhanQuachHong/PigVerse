import { expect, test } from "@playwright/test";

import {
  chooseInjectedWallet,
  installInjectedWallet,
  setInjectedWalletAccounts,
} from "./support/injected-wallet";

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

test("renders chain-owned cards and refreshes after an account change", async ({
  page,
}) => {
  const owner = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const emptyOwner = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const queriedAddresses: string[] = [];
  await installInjectedWallet(page, { account: owner, chainId: 84532 });
  await page.route("**/api/my-nfts?address=*", async (route) => {
    const address = new URL(route.request().url()).searchParams.get("address");
    if (!address) throw new Error("Missing wallet address query");
    queriedAddresses.push(address.toLowerCase());
    await route.fulfill({
      json: {
        address,
        block: "0x10",
        ownershipStatus: "known",
        tokens:
          address.toLowerCase() === owner
            ? [
                {
                  artwork: "/assets/nft/02-mochi.png",
                  metadataUri: "ipfs://fixture/2",
                  name: "Mochi",
                  owner,
                  status: "minted",
                  tokenId: 2,
                },
              ]
            : [],
      },
    });
  });
  await page.goto("/my-nfts");

  await chooseInjectedWallet(page);
  await expect(
    page.getByRole("heading", { name: "1 NFT đang sở hữu" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mochi" })).toBeVisible();

  await setInjectedWalletAccounts(page, [emptyOwner]);
  await expect(page.getByText("Chưa có NFT")).toBeVisible();
  expect(queriedAddresses).toEqual([owner, emptyOwner]);
});
