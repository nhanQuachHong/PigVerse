import { expect, type Page, test } from "@playwright/test";

async function installInjectedWallet(
  page: Page,
  options: {
    account: `0x${string}`;
    chainId: number;
    rejectConnection?: boolean;
  },
) {
  await page.addInitScript(({ account, chainId, rejectConnection }) => {
    type Listener = (...parameters: unknown[]) => void;
    const listeners = new Map<string, Set<Listener>>();
    let accounts = [account];
    let currentChainId = chainId;
    const emit = (event: string, value: unknown) => {
      for (const listener of listeners.get(event) ?? []) listener(value);
    };
    const provider = {
      isMetaMask: true,
      on(event: string, listener: Listener) {
        const current = listeners.get(event) ?? new Set<Listener>();
        current.add(listener);
        listeners.set(event, current);
        return provider;
      },
      removeListener(event: string, listener: Listener) {
        listeners.get(event)?.delete(listener);
        return provider;
      },
      async request({
        method,
        params,
      }: {
        method: string;
        params?: readonly unknown[];
      }) {
        if (method === "eth_accounts") return accounts;
        if (method === "eth_requestAccounts") {
          if (rejectConnection)
            throw Object.assign(new Error("User rejected request"), {
              code: 4001,
            });
          return accounts;
        }
        if (method === "eth_chainId") return `0x${currentChainId.toString(16)}`;
        if (method === "wallet_switchEthereumChain") {
          const requested = (params?.[0] as { chainId?: unknown } | undefined)
            ?.chainId;
          if (typeof requested !== "string") throw new Error("Invalid chain");
          currentChainId = Number.parseInt(requested, 16);
          emit("chainChanged", requested);
          return null;
        }
        throw Object.assign(new Error("Unsupported mock wallet method"), {
          code: 4200,
        });
      },
    };

    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: provider,
    });
    Object.defineProperty(window, "__pigverseMockWallet", {
      configurable: true,
      value: {
        setAccounts(nextAccounts: `0x${string}`[]) {
          accounts = nextAccounts;
          emit("accountsChanged", nextAccounts);
        },
      },
    });
  }, options);
}

async function chooseInjectedWallet(page: Page) {
  await page.getByRole("button", { name: "Kết nối ví" }).click();
  const dialog = page.getByRole("dialog", { name: "Chọn ví" });
  await expect(dialog).toBeVisible();
  await dialog.locator(".pv-wallet-options button").first().click();
}

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

  await page.evaluate((account) => {
    const controller = (
      window as Window & {
        __pigverseMockWallet?: {
          setAccounts(accounts: `0x${string}`[]): void;
        };
      }
    ).__pigverseMockWallet;
    if (!controller) throw new Error("Mock wallet is unavailable");
    controller.setAccounts([account as `0x${string}`]);
  }, secondAccount);
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
