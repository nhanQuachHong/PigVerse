import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { getWalletState, WalletControl } from "./wallet-control";

const walletMocks = vi.hoisted(() => ({
  connectMutate: vi.fn(),
  connection: {
    address: undefined as `0x${string}` | undefined,
    chain: undefined as { name: string } | undefined,
    chainId: undefined as number | undefined,
    status: "disconnected" as
      "connected" | "connecting" | "disconnected" | "reconnecting",
  },
  disconnectMutate: vi.fn(),
  switchMutate: vi.fn(),
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnect: () => ({
      isPending: false,
      mutate: walletMocks.connectMutate,
    }),
    useConnection: () => walletMocks.connection,
    useConnectors: () => [
      { id: "mock", name: "Mock Wallet", uid: "mock-wallet" },
    ],
    useDisconnect: () => ({ mutate: walletMocks.disconnectMutate }),
    useSwitchChain: () => ({
      isPending: false,
      mutate: walletMocks.switchMutate,
    }),
  };
});

function renderWallet(component: ReactNode = <WalletControl />) {
  return render(<LocaleProvider>{component}</LocaleProvider>);
}

describe("wallet state", () => {
  it("only treats a connected Base Sepolia account as ready", () => {
    expect(getWalletState({ isConnected: false })).toBe("disconnected");
    expect(getWalletState({ chainId: 1, isConnected: true })).toBe(
      "wrong-network",
    );
    expect(getWalletState({ chainId: 84532, isConnected: true })).toBe(
      "connected",
    );
  });
});

describe("WalletControl", () => {
  beforeEach(() => {
    walletMocks.connection.address = undefined;
    walletMocks.connection.chain = undefined;
    walletMocks.connection.chainId = undefined;
    walletMocks.connection.status = "disconnected";
    walletMocks.connectMutate.mockReset();
    walletMocks.disconnectMutate.mockReset();
    walletMocks.switchMutate.mockReset();
  });

  it("connects through a selected connector and closes on approval", async () => {
    const user = userEvent.setup();
    walletMocks.connectMutate.mockImplementation((_variables, callbacks) => {
      callbacks.onSuccess();
    });
    renderWallet();

    await user.click(screen.getByRole("button", { name: "Kết nối ví" }));
    expect(screen.getByRole("dialog", { name: "Chọn ví" })).toBeVisible();
    expect(
      screen.getByText(/không bao giờ yêu cầu private key/i),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Mock Wallet" }));

    expect(walletMocks.connectMutate).toHaveBeenCalledWith(
      { connector: expect.objectContaining({ id: "mock" }) },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the wallet disconnected and shows a generic rejection error", async () => {
    const user = userEvent.setup();
    walletMocks.connectMutate.mockImplementation((_variables, callbacks) => {
      callbacks.onError();
    });
    renderWallet();

    await user.click(screen.getByRole("button", { name: "Kết nối ví" }));
    await user.click(screen.getByRole("button", { name: "Mock Wallet" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không thể hoàn tất yêu cầu ví",
    );
    expect(screen.getByRole("button", { name: "Kết nối ví" })).toBeVisible();
  });

  it("reacts to account state and disconnects without creating auth state", async () => {
    const user = userEvent.setup();
    walletMocks.connection.address =
      "0x1111111111111111111111111111111111111234";
    walletMocks.connection.chain = { name: "Base Sepolia" };
    walletMocks.connection.chainId = 84532;
    walletMocks.connection.status = "connected";
    walletMocks.disconnectMutate.mockImplementation((_variables, callbacks) => {
      callbacks.onSuccess();
    });
    renderWallet();

    await user.click(
      screen.getByRole("button", { name: /0x1111…1234, Đã kết nối/ }),
    );
    expect(screen.getByText(walletMocks.connection.address)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ngắt kết nối" }));

    expect(walletMocks.disconnectMutate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.cookie).not.toMatch(/admin|session|auth/i);
  });

  it("blocks the ready state on a wrong network and requests Base Sepolia", async () => {
    const user = userEvent.setup();
    walletMocks.connection.address =
      "0x2222222222222222222222222222222222225678";
    walletMocks.connection.chain = { name: "Ethereum" };
    walletMocks.connection.chainId = 1;
    walletMocks.connection.status = "connected";
    renderWallet();

    await user.click(screen.getByRole("button", { name: "Sai mạng" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "chuyển sang Base Sepolia",
    );
    await user.click(
      screen.getByRole("button", { name: "Chuyển sang Base Sepolia" }),
    );

    expect(walletMocks.switchMutate).toHaveBeenCalledWith(
      { chainId: 84532 },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("updates the displayed account after a provider account change", () => {
    walletMocks.connection.address =
      "0x3333333333333333333333333333333333331234";
    walletMocks.connection.chainId = 84532;
    walletMocks.connection.status = "connected";
    const { rerender } = renderWallet();
    expect(screen.getByRole("button", { name: /0x3333…1234/ })).toBeVisible();

    walletMocks.connection.address =
      "0x4444444444444444444444444444444444449876";
    rerender(
      <LocaleProvider>
        <WalletControl />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: /0x4444…9876/ })).toBeVisible();
  });
});
