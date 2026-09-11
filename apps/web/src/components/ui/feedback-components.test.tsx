import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { Button } from "./button";
import { EmptyState, ErrorState, NFTCardSkeleton } from "./feedback-state";
import { Modal } from "./modal";
import { ToastProvider, useToast } from "./toast";

function renderWithProviders(component: ReactNode) {
  return render(
    <LocaleProvider>
      <ToastProvider>{component}</ToastProvider>
    </LocaleProvider>,
  );
}

describe("feedback components", () => {
  it("moves focus into a modal, closes on Escape and restores focus", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open dialog</Button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Dialog title"
          >
            Dialog content
          </Modal>
        </>
      );
    }

    renderWithProviders(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders reusable empty, error and loading semantics", () => {
    const { rerender } = renderWithProviders(<EmptyState />);
    expect(
      screen.getByRole("link", { name: /Khám phá bộ sưu tập/ }),
    ).toHaveAttribute("href", "/collection");

    rerender(
      <LocaleProvider>
        <ToastProvider>
          <ErrorState />
          <NFTCardSkeleton />
        </ToastProvider>
      </LocaleProvider>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading NFT")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("announces toast notifications through a live region", async () => {
    const user = userEvent.setup();

    function Harness() {
      const { notify } = useToast();
      return (
        <Button onClick={() => notify("Draft saved.", "success")}>
          Notify
        </Button>
      );
    }

    renderWithProviders(<Harness />);
    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByText("Draft saved.")).toBeInTheDocument();
  });
});
