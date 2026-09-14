import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { AdminAccessView } from "./admin-access-view";

vi.mock("./admin-content-panel", () => ({
  AdminContentPanel: () => <div>Protected content editor</div>,
}));

vi.mock("./admin-audit-panel", () => ({
  AdminAuditPanel: () => <div>Protected audit history</div>,
}));

vi.mock("./admin-mint-activity-panel", () => ({
  AdminMintActivityPanel: () => <div>Protected mint activity</div>,
}));

const owner = "0x1111111111111111111111111111111111111111" as const;
const other = "0x2222222222222222222222222222222222222222" as const;

const mocks = vi.hoisted(() => ({
  connection: {
    address: undefined as `0x${string}` | undefined,
    chainId: undefined as number | undefined,
    status: "disconnected" as "connected" | "disconnected",
  },
  query: {
    data: { authenticated: false } as
      | { authenticated: false }
      | {
          authenticated: true;
          expiresAt: string;
          walletAddress: `0x${string}`;
        },
    isError: false,
    isPending: false,
  },
  setQueryData: vi.fn(),
  signMessage: vi.fn(),
  switchChain: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => mocks.query,
    useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  };
});

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnection: () => mocks.connection,
    useSignMessage: () => ({ mutateAsync: mocks.signMessage }),
    useSwitchChain: () => ({
      isPending: false,
      mutate: mocks.switchChain,
    }),
  };
});

function renderView() {
  return render(
    <LocaleProvider>
      <AdminAccessView />
    </LocaleProvider>,
  );
}

describe("AdminAccessView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.connection.address = undefined;
    mocks.connection.chainId = undefined;
    mocks.connection.status = "disconnected";
    mocks.query.data = { authenticated: false };
    mocks.query.isError = false;
    mocks.query.isPending = false;
    mocks.setQueryData.mockReset();
    mocks.signMessage.mockReset();
    mocks.switchChain.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("requests the shared wallet modal without creating auth state", async () => {
    const listener = vi.fn();
    window.addEventListener("pigverse:open-wallet", listener);
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: /Kết nối ví/ }));

    expect(listener).toHaveBeenCalledOnce();
    expect(mocks.setQueryData).not.toHaveBeenCalled();
    window.removeEventListener("pigverse:open-wallet", listener);
  });

  it("creates a session only after the connected wallet signs", async () => {
    const user = userEvent.setup();
    mocks.connection.address = owner;
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.signMessage.mockResolvedValue("0xsignature");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ message: "issued message", nonce: "issuednonce" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          expiresAt: "2026-09-13T00:30:00.000Z",
          walletAddress: owner,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    renderView();

    await user.click(screen.getByRole("button", { name: "Ký để đăng nhập" }));

    expect(mocks.signMessage).toHaveBeenCalledWith({
      message: "issued message",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/admin/auth/verify",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ["admin-session"],
      expect.objectContaining({ authenticated: true, walletAddress: owner }),
    );
  });

  it("shows generic denial and never creates a session for a rejected signer", async () => {
    const user = userEvent.setup();
    mocks.connection.address = other;
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.signMessage.mockResolvedValue("0xsignature");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ message: "issued message", nonce: "issuednonce" }),
        )
        .mockResolvedValueOnce(
          Response.json({ message: "Authentication denied" }, { status: 401 }),
        ),
    );
    renderView();

    await user.click(screen.getByRole("button", { name: "Ký để đăng nhập" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không thể xác thực quyền Admin",
    );
    expect(mocks.setQueryData).not.toHaveBeenCalled();
  });

  it("warns when the active wallet differs from the verified Owner session", () => {
    mocks.connection.address = other;
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.query.data = {
      authenticated: true,
      expiresAt: "2026-09-13T00:30:00.000Z",
      walletAddress: owner,
    };
    renderView();

    expect(
      screen.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Ví đang kết nối khác");
  });
});
