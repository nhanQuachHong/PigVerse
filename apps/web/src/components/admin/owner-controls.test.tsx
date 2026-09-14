import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../i18n/locale-provider";
import { OwnerControls } from "./owner-controls";

const ownerWallet = "0x2222222222222222222222222222222222222222";
const contractAddress = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"a".repeat(64)}` as const;

const mocks = vi.hoisted(() => ({
  connection: {
    address: "0x2222222222222222222222222222222222222222",
    chainId: 84532,
    status: "connected",
  },
  balance: {
    data: { value: 250000000000000000n } as { value: bigint } | undefined,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  mintPrice: {
    data: 0n as bigint | undefined,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  paused: {
    data: false as boolean | undefined,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  receipt: {
    data: undefined as { status: "reverted" | "success" } | undefined,
    isError: false,
  },
  write: vi.fn(),
  writePending: false,
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useBalance: () => mocks.balance,
    useConnection: () => mocks.connection,
    useReadContract: ({ functionName }: { functionName: string }) =>
      functionName === "paused" ? mocks.paused : mocks.mintPrice,
    useWaitForTransactionReceipt: () => mocks.receipt,
    useWriteContract: () => ({
      isPending: mocks.writePending,
      mutateAsync: mocks.write,
    }),
  };
});

function renderControls() {
  return render(
    <LocaleProvider>
      <OwnerControls
        contractAddress={contractAddress}
        ownerWallet={ownerWallet}
      />
    </LocaleProvider>,
  );
}

describe("OwnerControls", () => {
  beforeEach(() => {
    mocks.connection.address = ownerWallet;
    mocks.connection.chainId = 84532;
    mocks.connection.status = "connected";
    mocks.balance.data = { value: 250000000000000000n };
    mocks.balance.isError = false;
    mocks.balance.isFetching = false;
    mocks.balance.refetch.mockReset();
    mocks.paused.data = false;
    mocks.paused.isError = false;
    mocks.paused.isFetching = false;
    mocks.paused.refetch.mockReset();
    mocks.mintPrice.data = 0n;
    mocks.mintPrice.isError = false;
    mocks.mintPrice.isFetching = false;
    mocks.mintPrice.refetch.mockReset();
    mocks.receipt.data = undefined;
    mocks.receipt.isError = false;
    mocks.write.mockReset();
    mocks.writePending = false;
    mocks.write.mockResolvedValue(transactionHash);
  });

  it("sends an Owner-signed pause transaction to the configured contract", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Tạm dừng mint" }));

    expect(mocks.write).toHaveBeenCalledWith({
      abi: expect.any(Array),
      account: ownerWallet,
      address: contractAddress,
      chainId: 84532,
      functionName: "pause",
    });
    expect(screen.getByRole("status")).toHaveTextContent("đang chờ");
  });

  it("uses unpause when the authoritative chain state is paused", async () => {
    const user = userEvent.setup();
    mocks.paused.data = true;
    renderControls();

    await user.click(screen.getByRole("button", { name: "Mở lại mint" }));

    expect(mocks.write).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "unpause" }),
    );
  });

  it("parses the entered ETH amount into exact wei", async () => {
    const user = userEvent.setup();
    renderControls();

    const price = screen.getByRole("textbox", {
      name: "Giá mint mới · ETH",
    });
    await user.clear(price);
    await user.type(price, "0.125");
    await user.click(
      screen.getByRole("button", { name: "Cập nhật giá on-chain" }),
    );

    expect(mocks.write).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [125000000000000000n],
        functionName: "setMintPrice",
      }),
    );
  });

  it("fails closed for a connected wallet that is not the session Owner", () => {
    mocks.connection.address = "0x3333333333333333333333333333333333333333";
    renderControls();

    expect(
      screen.getByRole("button", { name: "Tạm dừng mint" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("đúng ví Owner");
  });

  it("locks writes when a chain read is unavailable", () => {
    mocks.paused.data = undefined;
    mocks.paused.isError = true;
    renderControls();

    expect(
      screen.getByRole("button", { name: "Tạm dừng mint" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("khóa an toàn");
  });

  it("re-reads pause and price after a successful receipt", async () => {
    mocks.receipt.data = { status: "success" };
    renderControls();

    await waitFor(() => expect(mocks.paused.refetch).toHaveBeenCalledOnce());
    expect(mocks.mintPrice.refetch).toHaveBeenCalledOnce();
    expect(mocks.balance.refetch).toHaveBeenCalledOnce();
  });

  it("requires an explicit balance and recipient confirmation before withdrawing", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Withdraw số dư" }));

    expect(mocks.write).not.toHaveBeenCalled();
    const confirmation = screen.getByRole("group", {
      name: "Xác nhận withdraw",
    });
    expect(confirmation).toHaveTextContent(ownerWallet);
    expect(confirmation).toHaveTextContent("0.25 ETH");

    await user.click(screen.getByRole("button", { name: "Xác nhận withdraw" }));
    expect(mocks.write).toHaveBeenCalledWith(
      expect.objectContaining({
        account: ownerWallet,
        address: contractAddress,
        functionName: "withdraw",
      }),
    );
  });

  it("does not offer withdrawal when the contract balance is zero", () => {
    mocks.balance.data = { value: 0n };
    renderControls();

    expect(
      screen.getByRole("button", { name: "Withdraw số dư" }),
    ).toBeDisabled();
  });

  it("keeps an unresolvable receipt visible without claiming success", async () => {
    const user = userEvent.setup();
    mocks.receipt.isError = true;
    renderControls();

    await user.click(screen.getByRole("button", { name: "Tạm dừng mint" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "không suy đoán thành công",
    );
    expect(screen.queryByText("Giao dịch Owner đã included.")).toBeNull();
  });
});
