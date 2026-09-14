import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAuditPage } from "../../lib/admin-audit";
import { LocaleProvider } from "../i18n/locale-provider";
import { AdminAuditPanel } from "./admin-audit-panel";

const formerOwner = "0x2222222222222222222222222222222222222222" as const;
const page: AdminAuditPage = {
  events: [
    {
      action: "NFT_DRAFT_UPDATED",
      actorWallet: formerOwner,
      auditEventId: "7",
      correlationId: "correlation_7",
      createdAt: "2026-09-13T00:00:07.000Z",
      safeContext: { fromRevision: 1, toRevision: 2 },
      target: { id: "7", tokenId: 5, type: "NFT_CONTENT" },
    },
  ],
  nextCursor: "7",
};

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as { pages: AdminAuditPage[] } | undefined,
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
      <AdminAuditPanel />
    </LocaleProvider>,
  );
}

describe("AdminAuditPanel", () => {
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

  it("renders historical actor, target, action, time and revision evidence", () => {
    renderPanel();

    expect(screen.getByText("Cập nhật bản nháp")).toBeVisible();
    expect(screen.getByText("Token #5 · revision 1 → 2")).toBeVisible();
    expect(screen.getByTitle(formerOwner)).toHaveTextContent("0x2222…2222");
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-09-13T00:00:07.000Z",
    );
  });

  it("loads the next cursor page on demand", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Tải lịch sử cũ hơn" }),
    );
    expect(mocks.query.fetchNextPage).toHaveBeenCalledOnce();
  });

  it("renders explicit empty and unavailable states", () => {
    mocks.query.data = { pages: [{ events: [], nextCursor: null }] };
    mocks.query.hasNextPage = false;
    const view = renderPanel();
    expect(screen.getByText(/Chưa có thay đổi quản trị/)).toBeVisible();

    view.unmount();
    mocks.query.isError = true;
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Không tải được lịch sử audit",
    );
  });
});
