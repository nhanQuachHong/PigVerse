import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CHARACTER_CATALOG } from "../../lib/character-catalog";
import { LocaleProvider } from "../i18n/locale-provider";
import { HomeView } from "./home-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const data = {
  mintedCount: 3,
  degraded: false,
  tokens: CHARACTER_CATALOG.map((character, index) => ({
    ...character,
    metadataUri: null,
    owner: index < 3 ? "0x1111111111111111111111111111111111111111" : null,
    status: index < 3 ? ("minted" as const) : ("available" as const),
  })),
};

describe("HomeView", () => {
  it("satisfies the authoritative 3/10 Home acceptance state", () => {
    window.localStorage.setItem("pigverse-locale", "en");
    render(
      <LocaleProvider>
        <HomeView data={data} />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Meet the 10 Pigs of Pigverse" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/\/ 10 Minted/)).toHaveTextContent("3 / 10 Minted");
    expect(
      screen.getByRole("link", { name: "Explore Collection" }),
    ).toHaveAttribute("href", "/collection");
    expect(
      document.querySelectorAll(".pv-home-featured .pv-nft-card"),
    ).toHaveLength(4);
    expect(document.querySelectorAll(".pv-home-token-strip a")).toHaveLength(
      10,
    );
  });
});
