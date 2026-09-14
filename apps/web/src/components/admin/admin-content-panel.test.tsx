import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminContentSlot } from "../../lib/admin-content";
import { LocaleProvider } from "../i18n/locale-provider";
import { AdminContentPanel } from "./admin-content-panel";

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as AdminContentSlot[] | undefined,
    error: undefined as { code?: string } | undefined,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  },
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  updateDraft: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => mocks.query,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
      setQueryData: mocks.setQueryData,
    }),
  };
});

vi.mock("../../lib/admin-content", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/admin-content")>();
  return { ...actual, updateAdminDraft: mocks.updateDraft };
});

vi.mock("./publication-control", () => ({
  PublicationControl: () => <div data-testid="publication-control" />,
}));

function slots(): AdminContentSlot[] {
  return Array.from({ length: 10 }, (_, index) => ({
    chainState: index === 1 ? "minted" : "unminted",
    content: null,
    tokenId: index + 1,
  }));
}

function renderPanel() {
  return render(
    <LocaleProvider>
      <AdminContentPanel
        contractAddress="0x1111111111111111111111111111111111111111"
        ownerWallet="0x2222222222222222222222222222222222222222"
      />
    </LocaleProvider>,
  );
}

describe("AdminContentPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.query.data = slots();
    mocks.query.error = undefined;
    mocks.query.isError = false;
    mocks.query.isFetching = false;
    mocks.query.isPending = false;
    mocks.query.refetch.mockReset();
    mocks.setQueryData.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.updateDraft.mockReset();
  });

  it("shows all ten fixed identities and locks a minted selection", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    expect(
      container.querySelectorAll(".pv-admin-token-list button"),
    ).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /Mochi/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("Token đã mint");
    expect(
      screen.getByRole("button", { name: "Lưu revision mới" }),
    ).toBeDisabled();
  });

  it("saves a new bilingual revision with the revision read by the form", async () => {
    const user = userEvent.setup();
    mocks.updateDraft.mockResolvedValue({
      contentId: "1",
      descriptionEn: "An adventurer",
      descriptionVi: "Một nhà thám hiểm",
      lifecycleState: "DRAFT",
      nameEn: "Captain Oink",
      nameVi: "Captain Oink",
      revision: 1,
      storyEn: "",
      storyVi: "",
      tokenId: 1,
      updatedAt: "2026-09-13T00:00:00.000Z",
    });
    renderPanel();

    await user.type(screen.getByLabelText("Tên · Tiếng Việt"), "Captain Oink");
    await user.type(screen.getByLabelText("Name · English"), "Captain Oink");
    await user.type(
      screen.getByLabelText("Mô tả · Tiếng Việt"),
      "Một nhà thám hiểm",
    );
    await user.type(
      screen.getByLabelText("Description · English"),
      "An adventurer",
    );
    await user.click(screen.getByRole("button", { name: "Lưu revision mới" }));

    expect(mocks.updateDraft).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        expectedRevision: 0,
        nameEn: "Captain Oink",
        nameVi: "Captain Oink",
      }),
    );
    expect(mocks.setQueryData).toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["admin-audit"],
    });
    expect(screen.getByRole("status")).toHaveTextContent("Đã lưu");
  });

  it("surfaces a stale edit without creating a success state", async () => {
    const user = userEvent.setup();
    mocks.updateDraft.mockRejectedValue({ code: "STALE_EDIT" });
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Lưu revision mới" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Draft đã thay đổi ở nơi khác",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("clears the cached Admin session when the protected API denies it", () => {
    mocks.query.data = undefined;
    mocks.query.error = { code: "ADMIN_AUTH_REQUIRED" };
    mocks.query.isError = true;
    renderPanel();

    expect(mocks.setQueryData).toHaveBeenCalledWith(["admin-session"], {
      authenticated: false,
    });
  });
});
