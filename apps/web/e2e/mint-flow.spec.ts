import { expect, test } from "@playwright/test";
import { encodeFunctionData } from "viem";

import { genesisAbi } from "../src/lib/genesis-contract";
import { resolveBaseRpcFixture } from "./support/base-rpc-fixture";
import {
  chooseInjectedWallet,
  getInjectedWalletRequests,
  installInjectedWallet,
} from "./support/injected-wallet";

const account = "0x2222222222222222222222222222222222222222";
const contract = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"b".repeat(64)}` as const;
const revertedHash = `0x${"d".repeat(64)}` as const;

function receiptFixture(hash: `0x${string}`, status: "0x0" | "0x1") {
  return {
    blockHash: `0x${"c".repeat(64)}`,
    blockNumber: "0x100",
    contractAddress: null,
    cumulativeGasUsed: "0x5208",
    effectiveGasPrice: "0x1",
    from: account,
    gasUsed: "0x5208",
    logs: [],
    logsBloom: `0x${"0".repeat(512)}`,
    status,
    to: contract,
    transactionHash: hash,
    transactionIndex: "0x0",
    type: "0x2",
  };
}

test("submits the exact selected token and restores its authoritative outcome", async ({
  page,
}) => {
  let receiptAvailable = false;
  await installInjectedWallet(page, {
    account,
    chainId: 84532,
    transactionHash,
  });
  await page.route("https://sepolia.base.org/**", async (route) => {
    const payload = route.request().postDataJSON() as {
      id: number;
      jsonrpc: "2.0";
      method: string;
      params?: readonly unknown[];
    };
    const outcome =
      payload.method === "eth_getTransactionReceipt" && receiptAvailable
        ? {
            result: receiptFixture(transactionHash, "0x1"),
          }
        : resolveBaseRpcFixture(payload.method, payload.params ?? []);
    await route.fulfill({
      json: { id: payload.id, jsonrpc: "2.0", ...outcome },
    });
  });
  await page.route("**/api/mint-activity", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/nft/4");
  await expect(
    page.getByRole("heading", { name: "Chef Pippa", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Mint NFT này")).toBeVisible();

  await chooseInjectedWallet(page);
  await page.getByRole("button", { name: "Mint NFT" }).click();
  await expect(
    page.getByRole("button", { name: "Đang chờ xác nhận…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem giao dịch" }),
  ).toHaveAttribute(
    "href",
    `https://sepolia.basescan.org/tx/${transactionHash}`,
  );
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `pigverse:mint:84532:${contract}:4:${account}`,
    ),
  ).toBe(transactionHash);

  const walletRequests = await getInjectedWalletRequests(page);
  const submission = walletRequests.find(
    ({ method }) => method === "eth_sendTransaction",
  );
  expect(submission?.params?.[0]).toMatchObject({
    data: encodeFunctionData({
      abi: genesisAbi,
      args: [4n, 3n],
      functionName: "mint",
    }),
    from: account,
    to: contract,
    value: "0x64",
  });

  receiptAvailable = true;
  await expect(page.getByText("Mint đã xác nhận!")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/Chef Pippa #4.*0x2222/u)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Mint đã xác nhận!")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.locator("#main-content").getByRole("link", { name: "NFT của tôi" }),
  ).toHaveAttribute("href", "/my-nfts");
  await page.waitForLoadState("networkidle");
});

test("reports an included revert without claiming ownership", async ({
  page,
}) => {
  await installInjectedWallet(page, {
    account,
    chainId: 84532,
    transactionHash: revertedHash,
  });
  await page.route("https://sepolia.base.org/**", async (route) => {
    const payload = route.request().postDataJSON() as {
      id: number;
      jsonrpc: "2.0";
      method: string;
      params?: readonly unknown[];
    };
    const outcome =
      payload.method === "eth_getTransactionReceipt"
        ? { result: receiptFixture(revertedHash, "0x0") }
        : resolveBaseRpcFixture(payload.method, payload.params ?? []);
    await route.fulfill({
      json: { id: payload.id, jsonrpc: "2.0", ...outcome },
    });
  });
  await page.route("**/api/mint-activity", (route) =>
    route.fulfill({ status: 204 }),
  );

  await page.goto("/nft/4");
  await chooseInjectedWallet(page);
  await page.getByRole("button", { name: "Mint NFT" }).click();

  await expect(page.locator(".pv-mint-panel__error")).toContainText(
    "Giao dịch đã thất bại; quyền sở hữu không thay đổi",
    { timeout: 10_000 },
  );
  await expect(page.getByText("Mint đã xác nhận!")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Xem giao dịch" }),
  ).toHaveAttribute("href", `https://sepolia.basescan.org/tx/${revertedHash}`);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `pigverse:mint:84532:${contract}:4:${account}`,
    ),
  ).toBe(revertedHash);
  await page.waitForLoadState("networkidle");
});

test("keeps chain state unconfirmed when the wallet rejects mint", async ({
  page,
}) => {
  await installInjectedWallet(page, {
    account,
    chainId: 84532,
    rejectTransaction: true,
  });
  await page.route("https://sepolia.base.org/**", async (route) => {
    const payload = route.request().postDataJSON() as {
      id: number;
      jsonrpc: "2.0";
      method: string;
      params?: readonly unknown[];
    };
    await route.fulfill({
      json: {
        id: payload.id,
        jsonrpc: "2.0",
        ...resolveBaseRpcFixture(payload.method, payload.params ?? []),
      },
    });
  });

  await page.goto("/nft/4");
  await chooseInjectedWallet(page);
  await page.getByRole("button", { name: "Mint NFT" }).click();

  await expect(page.locator(".pv-mint-panel__error")).toContainText(
    "Giao dịch chưa được gửi",
  );
  await expect(page.getByText("Mint đã xác nhận!")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Xem giao dịch" })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `pigverse:mint:84532:${contract}:4:${account}`,
    ),
  ).toBeNull();
  expect(
    (await getInjectedWalletRequests(page)).filter(
      ({ method }) => method === "eth_sendTransaction",
    ),
  ).toHaveLength(1);
  await page.waitForLoadState("networkidle");
});
