import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdminMintActivity,
  AdminMintActivityPage,
} from "../../lib/admin-mint-activity";
import { LocaleProvider } from "../i18n/locale-provider";
import { AdminMintActivityPanel } from "./admin-mint-activity-panel";

const senderWallet = `0x${"a".repeat(40)}` as const;
const ownerWallet = `0x${"e".repeat(40)}` as const;
const blockHash = `0x${"d".repeat(64)}` as const;

function activity(
  status: AdminMintActivity["status"],
  id: number,
): AdminMintActivity {
  const included = status === "SUCCEEDED" || status === "REVERTED";
  return {
    blockHash: included ? blockHash : null,
    blockNumber: included ? "2748" : null,
    expectedPublicationRevision: "4",
    finality: status === "SUCCEEDED" ? "included" : null,
    firstSeenAt: "2026-09-13T00:00:00.000Z",
    lastObservedAt: "2026-09-13T00:01:00.000Z",
    mintObservationId: String(id),
    observedOwnerWallet: status === "SUCCEEDED" ? ownerWallet : null,
    reconciliation: status === "UNKNOWN" ? "unavailable" : "current",
    safeErrorCategory:
      status === "REVERTED"
        ? "EVM_REVERT"
        : status === "UNKNOWN"
          ? "TRANSACTION_NOT_FOUND"
          : null,
    senderWallet,
    status,
    tokenId: id,
    transactionHash: `0x${String(id).repeat(64)}` as `0x${string}`,
    transferLogIndex: status === "SUCCEEDED" ? 7 : null,
  };
}

const page: AdminMintActivityPage = {
  activities: [
    activity("SUCCEEDED", 1),
    activity("REVERTED", 2),
    activity("PENDING", 3),
    activity("UNKNOWN", 4),
  ],
  nextCursor: "1",
};

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as { pages: AdminMintActivityPage[] } | undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useInfiniteQuery: () => mocks.query };
});

function renderPanel() {
  return render(
    <LocaleProvider>
      <AdminMintActivityPanel />
    </LocaleProvider>,
  );
}

describe("AdminMintActivityPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.query.data = { pages: [page] };
    mocks.query.hasNextPage = true;
    mocks.query.isError = false;
    mocks.query.isFetching = false;
    mocks.query.isFetchingNextPage = false;
    mocks.query.isPending = false;
    mocks.query.fetchNextPage.mockReset();
    mocks.query.refetch.mockReset();
  });

  it("distinguishes success, revert, pending and unknown outcomes", () => {
    renderPanel();

    expect(screen.getByText("Đã included")).toBeVisible();
    expect(screen.getByText("Đã revert")).toBeVisible();
    expect(screen.getByText("Đang chờ")).toBeVisible();
    expect(screen.getByText("Chưa xác định")).toBeVisible();
    expect(screen.getByText("Chưa đối soát được")).toBeVisible();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      `https://sepolia.basescan.org/tx/${`0x${"1".repeat(64)}`}`,
    );
  });

  it("loads older activity only on request", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Tải hoạt động cũ hơn" }),
    );
    expect(mocks.query.fetchNextPage).toHaveBeenCalledOnce();
  });

  it("renders explicit empty and unavailable states", () => {
    mocks.query.data = { pages: [{ activities: [], nextCursor: null }] };
    mocks.query.hasNextPage = false;
    const view = renderPanel();
    expect(screen.getByText("Chưa ghi nhận giao dịch mint nào.")).toBeVisible();

    view.unmount();
    mocks.query.isError = true;
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không thể tải hoặc đối soát",
    );
  });
});
