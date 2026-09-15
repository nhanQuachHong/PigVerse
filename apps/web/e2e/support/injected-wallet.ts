import { expect, type Page } from "@playwright/test";

export async function installInjectedWallet(
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

export async function chooseInjectedWallet(page: Page) {
  await page.getByRole("button", { name: "Kết nối ví" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Chọn ví" });
  await expect(dialog).toBeVisible();
  await dialog.locator(".pv-wallet-options button").first().click();
}

export async function setInjectedWalletAccounts(
  page: Page,
  accounts: `0x${string}`[],
) {
  await page.evaluate((nextAccounts) => {
    const controller = (
      window as Window & {
        __pigverseMockWallet?: {
          setAccounts(accounts: `0x${string}`[]): void;
        };
      }
    ).__pigverseMockWallet;
    if (!controller) throw new Error("Mock wallet is unavailable");
    controller.setAccounts(nextAccounts as `0x${string}`[]);
  }, accounts);
}
