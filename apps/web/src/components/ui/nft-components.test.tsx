import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { NFTCard } from "./nft-card";
import { NFTStatusBadge } from "./nft-status-badge";
import { WalletButton } from "./wallet-button";

function renderWithLocale(component: ReactNode) {
  return render(<LocaleProvider>{component}</LocaleProvider>);
}

describe("NFT and wallet primitives", () => {
  it("labels an unknown chain state without suggesting availability", () => {
    renderWithLocale(<NFTStatusBadge status="unknown" />);
    expect(screen.getByText("Chưa xác định")).toHaveAttribute(
      "data-status",
      "unknown",
    );
    expect(screen.queryByText("Có thể mint")).not.toBeInTheDocument();
  });

  it("renders localized NFT status", () => {
    renderWithLocale(<NFTStatusBadge status="available" />);
    expect(screen.getByText("Có thể mint")).toBeInTheDocument();
  });

  it("exposes connected wallet state in its accessible name", () => {
    renderWithLocale(<WalletButton state="connected" />);
    expect(
      screen.getByRole("button", { name: "0xA3bc…7F2D, Đã kết nối" }),
    ).toBeInTheDocument();
  });

  it("links an NFT card to its token-specific route", () => {
    renderWithLocale(
      <NFTCard
        description="To the moon"
        href="/nft/1"
        imageAlt="Captain Oink in space"
        imageSrc="/assets/nft/01-captain-oink.png"
        name="Captain Oink"
        status="minted"
        tokenId={1}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Captain Oink, token #01" }),
    ).toHaveAttribute("href", "/nft/1");
    expect(
      screen.getByRole("img", { name: "Captain Oink in space" }),
    ).toBeInTheDocument();
  });
});
