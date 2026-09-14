import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicNftDetail } from "../../lib/public-nft-detail";
import { LocaleProvider } from "../i18n/locale-provider";
import { MintPanel } from "./mint-panel";

const mocks = vi.hoisted(() => ({
  connection: {
    address: "0x2222222222222222222222222222222222222222" as
      `0x${string}` | undefined,
    chainId: 84532 as number | undefined,
    status: "connected" as "connected" | "disconnected",
  },
  publicClient: {
    readContract: vi.fn(),
    simulateContract: vi.fn(),
  },
  receipt: {
    data: undefined as { status: "reverted" | "success" } | undefined,
    isError: false,
  },
  refresh: vi.fn(),
  switchMutate: vi.fn(),
  writeData: undefined as `0x${string}` | undefined,
  writeMutateAsync: vi.fn(),
  reportMintTransaction: vi.fn(),
}));

vi.mock("../../lib/mint-activity-client", () => ({
  reportMintTransaction: mocks.reportMintTransaction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnection: () => mocks.connection,
    usePublicClient: () => mocks.publicClient,
    useSwitchChain: () => ({ isPending: false, mutate: mocks.switchMutate }),
    useWaitForTransactionReceipt: () => mocks.receipt,
    useWriteContract: () => ({
      data: mocks.writeData,
      isPending: false,
      mutateAsync: mocks.writeMutateAsync,
    }),
  };
});

const contract = "0x1111111111111111111111111111111111111111";
const detail: PublicNftDetail = {
  block: "0x123",
  contentStatus: "pending-approval",
  degraded: false,
  deployment: {
    chainId: 84532,
    contract,
    explorerUrl: `https://sepolia.basescan.org/address/${contract}`,
    network: "Base Sepolia",
  },
  relatedTokens: [],
  token: {
    artwork: "/assets/nft/04-chef-pippa.png",
    metadataUri: "ipfs://fixture/4",
    name: "Chef Pippa",
    owner: null,
    status: "available",
    tokenId: 4,
  },
};

function renderPanel(value: PublicNftDetail = detail) {
  return render(
    <LocaleProvider>
      <MintPanel detail={value} />
    </LocaleProvider>,
  );
}

describe("MintPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.connection.address = "0x2222222222222222222222222222222222222222";
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.receipt.data = undefined;
    mocks.receipt.isError = false;
    mocks.writeData = undefined;
    mocks.publicClient.readContract.mockReset();
    mocks.publicClient.simulateContract.mockReset();
    mocks.refresh.mockReset();
    mocks.switchMutate.mockReset();
    mocks.writeMutateAsync.mockReset();
    mocks.reportMintTransaction.mockReset();
    mocks.reportMintTransaction.mockResolvedValue(undefined);
  });

  it("never offers mint when deployment state is unverified", () => {
    renderPanel({
      ...detail,
      degraded: true,
      deployment: null,
      token: { ...detail.token, metadataUri: null, status: "unknown" },
    });

    expect(screen.getByText("Mint chưa khả dụng")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Mint NFT" })).toBeNull();
  });

  it("guides a connected wallet to the approved chain", async () => {
    const user = userEvent.setup();
    mocks.connection.chainId = 1;
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Chuyển sang Base Sepolia" }),
    );
    expect(mocks.switchMutate).toHaveBeenCalledWith({ chainId: 84532 });
    expect(mocks.writeMutateAsync).not.toHaveBeenCalled();
  });

  it("re-reads price, pause and publication before exact-token submission", async () => {
    const user = userEvent.setup();
    const transactionHash = `0x${"a".repeat(64)}` as const;
    mocks.publicClient.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "paused") return Promise.resolve(false);
      if (functionName === "mintPrice") return Promise.resolve(100n);
      if (functionName === "publicationRevision") return Promise.resolve(3n);
      if (functionName === "publishedURI")
        return Promise.resolve("ipfs://fixture/4");
      throw new Error("Unexpected read");
    });
    mocks.publicClient.simulateContract.mockResolvedValue({ request: {} });
    mocks.writeMutateAsync.mockResolvedValue(transactionHash);
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Mint NFT" }));

    await waitFor(() => expect(mocks.writeMutateAsync).toHaveBeenCalledOnce());
    expect(mocks.publicClient.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        account: mocks.connection.address,
        address: contract,
        args: [4n, 3n],
        functionName: "mint",
        value: 100n,
      }),
    );
    expect(mocks.writeMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        address: contract,
        args: [4n, 3n],
        chainId: 84532,
        functionName: "mint",
        value: 100n,
      }),
    );
    expect(
      window.localStorage.getItem(
        `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      ),
    ).toBe(transactionHash);
    await waitFor(() =>
      expect(mocks.reportMintTransaction).toHaveBeenCalledWith(transactionHash),
    );
  });

  it("does not submit when the fresh contract state is paused", async () => {
    const user = userEvent.setup();
    mocks.publicClient.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "paused") return Promise.resolve(true);
      if (functionName === "mintPrice") return Promise.resolve(0n);
      if (functionName === "publicationRevision") return Promise.resolve(3n);
      return Promise.resolve("ipfs://fixture/4");
    });
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Mint NFT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mint đang tạm dừng on-chain",
    );
    expect(mocks.publicClient.simulateContract).not.toHaveBeenCalled();
    expect(mocks.writeMutateAsync).not.toHaveBeenCalled();
  });

  it("does not persist or claim ownership when the wallet rejects submission", async () => {
    const user = userEvent.setup();
    mocks.publicClient.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "paused") return Promise.resolve(false);
      if (functionName === "mintPrice") return Promise.resolve(0n);
      if (functionName === "publicationRevision") return Promise.resolve(3n);
      return Promise.resolve("ipfs://fixture/4");
    });
    mocks.publicClient.simulateContract.mockResolvedValue({ request: {} });
    mocks.writeMutateAsync.mockRejectedValue(new Error("User rejected"));
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Mint NFT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Giao dịch chưa được gửi",
    );
    expect(screen.queryByText("Mint đã xác nhận!")).toBeNull();
    expect(
      window.localStorage.getItem(
        `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      ),
    ).toBeNull();
  });

  it("restores a known hash, reports it and only celebrates an authoritative success", async () => {
    const transactionHash = `0x${"b".repeat(64)}`;
    window.localStorage.setItem(
      `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      transactionHash,
    );
    mocks.receipt.data = { status: "success" };
    renderPanel();

    expect(screen.getByText("Mint đã xác nhận!")).toBeVisible();
    expect(screen.getByText(/thuộc ví 0x2222/)).toBeVisible();
    expect(screen.getByRole("link", { name: "NFT của tôi" })).toHaveAttribute(
      "href",
      "/my-nfts",
    );
    await waitFor(() =>
      expect(mocks.reportMintTransaction).toHaveBeenCalledWith(transactionHash),
    );
  });

  it("keeps an RPC-uncertain transaction non-successful", () => {
    const transactionHash = `0x${"c".repeat(64)}`;
    window.localStorage.setItem(
      `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      transactionHash,
    );
    mocks.receipt.isError = true;
    renderPanel();

    expect(screen.queryByText("Mint đã xác nhận!")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Chưa xác định kết quả/ }),
    ).toHaveAttribute(
      "href",
      `https://sepolia.basescan.org/tx/${transactionHash}`,
    );
  });

  it("shows a reverted receipt as failure rather than ownership", () => {
    const transactionHash = `0x${"d".repeat(64)}`;
    window.localStorage.setItem(
      `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      transactionHash,
    );
    mocks.receipt.data = { status: "reverted" };
    renderPanel();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Giao dịch đã thất bại; quyền sở hữu không thay đổi",
    );
    expect(screen.queryByText("Mint đã xác nhận!")).toBeNull();
  });

  it("keeps receipt-derived success when activity reporting is unavailable", () => {
    const transactionHash = `0x${"e".repeat(64)}`;
    window.localStorage.setItem(
      `pigverse:mint:84532:${contract}:4:${mocks.connection.address}`,
      transactionHash,
    );
    mocks.receipt.data = { status: "success" };
    mocks.reportMintTransaction.mockRejectedValue(new Error("API unavailable"));
    renderPanel();

    expect(screen.getByText("Mint đã xác nhận!")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
