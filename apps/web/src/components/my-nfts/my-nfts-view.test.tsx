import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { MyNftsView } from "./my-nfts-view";

const mocks = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  query: {
    data: undefined as
      | {
          address: `0x${string}`;
          block: string;
          ownershipStatus: "known" | "unavailable";
          tokens: Array<{
            artwork: string;
            metadataUri: string;
            name: string;
            owner: string;
            status: "minted";
            tokenId: number;
          }>;
        }
      | undefined,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  },
  queryOptions: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useConnection: () =>
    mocks.address
      ? { address: mocks.address, status: "connected" }
      : { address: undefined, status: "disconnected" },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => {
    mocks.queryOptions(options);
    return mocks.query;
  },
}));

function renderView() {
  return render(
    <LocaleProvider>
      <MyNftsView />
    </LocaleProvider>,
  );
}

describe("MyNftsView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.address = undefined;
    mocks.query.data = undefined;
    mocks.query.isError = false;
    mocks.query.isFetching = false;
    mocks.query.isPending = false;
    mocks.query.refetch.mockReset();
    mocks.queryOptions.mockReset();
  });

  it("requests wallet connection without inventing ownership", async () => {
    const listener = vi.fn();
    window.addEventListener("pigverse:open-wallet", listener);
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Kết nối ví" }));
    expect(listener).toHaveBeenCalledOnce();
    expect(screen.queryByText(/NFT đang sở hữu/)).toBeNull();
    window.removeEventListener("pigverse:open-wallet", listener);
  });

  it("shows the shared empty state for a verified zero-token result", () => {
    mocks.address = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    mocks.query.data = {
      address: mocks.address,
      block: "0x123",
      ownershipStatus: "known",
      tokens: [],
    };
    renderView();

    expect(screen.getByText("Chưa có NFT")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Khám phá bộ sưu tập/ }),
    ).toHaveAttribute("href", "/collection");
  });

  it("renders only chain-owned cards and can refresh external transfers", async () => {
    const user = userEvent.setup();
    mocks.address = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    mocks.query.data = {
      address: mocks.address,
      block: "0x123",
      ownershipStatus: "known",
      tokens: [
        {
          artwork: "/assets/nft/02-mochi.png",
          metadataUri: "ipfs://fixture/2",
          name: "Mochi",
          owner: mocks.address,
          status: "minted",
          tokenId: 2,
        },
      ],
    };
    renderView();

    expect(screen.getByRole("heading", { name: "Mochi" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Làm mới từ chain" }));
    expect(mocks.query.refetch).toHaveBeenCalledOnce();
  });

  it("shows recoverable error instead of false empty on degraded ownership", () => {
    mocks.address = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    mocks.query.data = {
      address: mocks.address,
      block: "0x123",
      ownershipStatus: "unavailable",
      tokens: [],
    };
    renderView();

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText(/Không hiển thị danh sách rỗng giả/)).toBeVisible();
    expect(screen.queryByText("Chưa có NFT")).toBeNull();
  });

  it("changes the ownership query key when the wallet account changes", () => {
    mocks.address = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const { rerender } = renderView();
    expect(mocks.queryOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["my-genesis-nfts", mocks.address],
      }),
    );

    mocks.address = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    rerender(
      <LocaleProvider>
        <MyNftsView />
      </LocaleProvider>,
    );
    expect(mocks.queryOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["my-genesis-nfts", mocks.address],
      }),
    );
  });
});
