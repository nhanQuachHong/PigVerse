import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LocaleProvider, useLocale } from "../i18n/locale-provider";
import { StoryView } from "./story-view";

function Harness() {
  const { setLocale } = useLocale();
  return (
    <>
      <button onClick={() => setLocale("en")} type="button">
        EN
      </button>
      <StoryView />
    </>
  );
}

describe("StoryView", () => {
  it("renders an explicit non-canon pending state in both locales", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Harness />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Câu chuyện Pigverse" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "không xuất bản nội dung tạm như canon",
    );
    expect(screen.getAllByText("Đang chờ nội dung được duyệt")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(
      screen.getByRole("heading", { name: "The Pigverse Story" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "does not publish placeholder copy as canon",
    );
    expect(screen.getAllByText("Approved copy pending")).toHaveLength(3);
  });
});
