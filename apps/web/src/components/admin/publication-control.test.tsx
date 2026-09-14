import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminContentSlot } from "../../lib/admin-content";
import { pendingPublicationKey } from "../../lib/pending-publication";
import { LocaleProvider } from "../i18n/locale-provider";
import { PublicationControl } from "./publication-control";

const ownerWallet = "0x2222222222222222222222222222222222222222";
const contractAddress = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"a".repeat(64)}` as const;

const mocks = vi.hoisted(() => ({
  connection: {
    address: "0x2222222222222222222222222222222222222222",
    chainId: 84532,
    status: "connected",
  },
  prepare: vi.fn(),
  receipt: {
    data: undefined as { status: "reverted" | "success" } | undefined,
    isError: false,
  },
  record: vi.fn(),
  send: vi.fn(),
  setQueryData: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  };
});

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnection: () => mocks.connection,
    useSendTransaction: () => ({ mutateAsync: mocks.send }),
    useWaitForTransactionReceipt: () => mocks.receipt,
  };
});

vi.mock("../../lib/admin-publication", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/admin-publication")>();
  return {
    ...actual,
    prepareAdminPublication: mocks.prepare,
    recordAdminPublication: mocks.record,
  };
});

function slot(lifecycleState: "PUBLISHED" | "READY" = "READY") {
  return {
    chainState: "unminted",
    content: {
      contentId: "7",
      descriptionEn: "English description",
      descriptionVi: "Mô tả tiếng Việt",
      lifecycleState,
      nameEn: "Professor Truffle",
      nameVi: "Professor Truffle",
      revision: 2,
      storyEn: "English story",
      storyVi: "Câu chuyện tiếng Việt",
      tokenId: 3,
      updatedAt: "2026-09-14T00:00:00.000Z",
    },
    tokenId: 3,
  } satisfies AdminContentSlot;
}

function renderControl(current = slot()) {
  return render(
    <LocaleProvider>
      <PublicationControl
        contractAddress={contractAddress}
        ownerWallet={ownerWallet}
        slot={current}
      />
    </LocaleProvider>,
  );
}

describe("PublicationControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.connection.address = ownerWallet;
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.prepare.mockReset();
    mocks.record.mockReset();
    mocks.send.mockReset();
    mocks.setQueryData.mockReset();
    mocks.receipt.data = undefined;
    mocks.receipt.isError = false;
    mocks.prepare.mockResolvedValue({
      action: "publish",
      block: "0xabc",
      contentId: "7",
      contentRevision: 2,
      expectedPublicationRevision: "4",
      metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
      transaction: {
        chainId: 84532,
        data: "0x1234",
        to: contractAddress,
        value: "0x0",
      },
    });
    mocks.send.mockResolvedValue(transactionHash);
    mocks.record.mockResolvedValue({
      action: "publish",
      contentId: "7",
      contentRevision: 2,
      finality: "included",
      lifecycleState: "PUBLISHED",
      publicationRevision: "5",
      tokenId: 3,
      transactionHash,
    });
  });

  it("prepares and sends the exact server-validated Owner transaction", async () => {
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole("button", { name: "Publish on-chain" }));

    expect(mocks.prepare).toHaveBeenCalledWith(3, "publish");
    expect(mocks.send).toHaveBeenCalledWith({
      chainId: 84532,
      data: "0x1234",
      to: contractAddress,
      value: 0n,
    });
    const key = pendingPublicationKey({
      account: ownerWallet,
      chainId: 84532,
      contract: contractAddress,
      tokenId: 3,
    });
    expect(window.localStorage.getItem(key)).toBe(transactionHash);
    expect(screen.getByRole("status")).toHaveTextContent("đang chờ");
  });

  it("prepares the unpublish action from PUBLISHED state", async () => {
    const user = userEvent.setup();
    mocks.prepare.mockResolvedValueOnce({
      action: "unpublish",
      block: "0xabc",
      contentId: "7",
      contentRevision: 2,
      expectedPublicationRevision: "4",
      metadataIpfsUri: null,
      transaction: {
        chainId: 84532,
        data: "0x5678",
        to: contractAddress,
        value: "0x0",
      },
    });
    renderControl(slot("PUBLISHED"));

    await user.click(
      screen.getByRole("button", { name: "Unpublish on-chain" }),
    );
    expect(mocks.prepare).toHaveBeenCalledWith(3, "unpublish");
  });

  it("restores an included transaction and records the lifecycle projection", async () => {
    const key = pendingPublicationKey({
      account: ownerWallet,
      chainId: 84532,
      contract: contractAddress,
      tokenId: 3,
    });
    window.localStorage.setItem(key, transactionHash);
    mocks.receipt.data = { status: "success" };
    renderControl();

    await waitFor(() =>
      expect(mocks.record).toHaveBeenCalledWith(3, transactionHash),
    );
    expect(mocks.setQueryData).toHaveBeenCalled();
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("được ghi nhận");
  });

  it("disables contract actions for a wallet that differs from the session Owner", () => {
    mocks.connection.address = "0x3333333333333333333333333333333333333333";
    renderControl();

    expect(
      screen.getByRole("button", { name: "Publish on-chain" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("đúng ví Owner");
  });

  it("shows a stable readiness error without inventing success", async () => {
    const user = userEvent.setup();
    mocks.prepare.mockRejectedValueOnce({ code: "ASSET_NOT_READY" });
    renderControl();

    await user.click(screen.getByRole("button", { name: "Publish on-chain" }));
    expect(screen.getByRole("alert")).toHaveTextContent("chưa COMPLETE");
    expect(screen.queryByText(/được ghi nhận/)).toBeNull();
  });

  it("fails closed on the wrong network without preparing a transaction", () => {
    mocks.connection.chainId = 8453;
    renderControl();

    expect(
      screen.getByRole("button", { name: "Publish on-chain" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Base Sepolia");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("keeps a reverted transaction visible until the Owner clears it", async () => {
    const user = userEvent.setup();
    const key = pendingPublicationKey({
      account: ownerWallet,
      chainId: 84532,
      contract: contractAddress,
      tokenId: 3,
    });
    window.localStorage.setItem(key, transactionHash);
    mocks.receipt.data = { status: "reverted" };
    renderControl();

    expect(screen.getByRole("status")).toHaveTextContent("revert on-chain");
    expect(mocks.record).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Xóa giao dịch thất bại" }),
    );
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
