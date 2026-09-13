import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicNftDetail } from "../../lib/public-nft-detail";
import { LocaleProvider } from "../i18n/locale-provider";
import { NftDetailView } from "./nft-detail-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const owner = "0x2222222222222222222222222222222222222222";
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
    artwork: "/assets/nft/06-nova.png",
    metadataUri: "ipfs://fixture/6",
    name: "Nova",
    owner,
    status: "minted",
    tokenId: 6,
  },
};

describe("NftDetailView", () => {
  it("renders minted owner and deployment identifiers without replacing chain data", () => {
    window.localStorage.setItem("pigverse-locale", "en");
    render(
      <LocaleProvider>
        <NftDetailView detail={detail} />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Nova", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTitle(owner)).toHaveAttribute(
      "href",
      `https://sepolia.basescan.org/address/${owner}`,
    );
    expect(screen.getByTitle(contract)).toHaveAttribute(
      "href",
      `https://sepolia.basescan.org/address/${contract}`,
    );
    expect(screen.getByTitle("ipfs://fixture/6")).toHaveTextContent(
      "ipfs://fixture/6",
    );
    expect(screen.queryByText(/Unknown does not mean/)).not.toBeInTheDocument();
  });
});
