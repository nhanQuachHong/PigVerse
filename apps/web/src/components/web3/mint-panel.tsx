"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Hash } from "viem";
import {
  useConnection,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { genesisAbi } from "../../lib/genesis-contract";
import { reportMintTransaction } from "../../lib/mint-activity-client";
import {
  PENDING_MINT_EVENT,
  pendingMintKey,
  readPendingMint,
  writePendingMint,
} from "../../lib/pending-mint";
import type { PublicNftDetail } from "../../lib/public-nft-detail";
import { targetChain } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { useAuthoritativeReceipt } from "./use-authoritative-receipt";

type PreflightFailure = "paused" | "unpublished";

class MintPreflightError extends Error {
  constructor(readonly reason: PreflightFailure) {
    super(reason);
  }
}

export function MintPanel({ detail }: { detail: PublicNftDetail }) {
  const { locale } = useLocale();
  const router = useRouter();
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const switchChain = useSwitchChain();
  const writeContract = useWriteContract();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string>();
  const reportedObservation = useRef<string | undefined>(undefined);
  const vi = locale === "vi";
  const { deployment, token } = detail;
  const correctNetwork = connection.chainId === targetChain.id;
  const storageKey =
    deployment && connection.address
      ? pendingMintKey({
          account: connection.address,
          chainId: deployment.chainId,
          contract: deployment.contract,
          tokenId: token.tokenId,
        })
      : null;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(PENDING_MINT_EVENT, notify);
    window.addEventListener("storage", notify);
    return () => {
      window.removeEventListener(PENDING_MINT_EVENT, notify);
      window.removeEventListener("storage", notify);
    };
  }, []);
  const getSnapshot = useCallback(
    () => (storageKey ? readPendingMint(storageKey) : undefined),
    [storageKey],
  );
  const persistedHash = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => undefined,
  );
  const hash = persistedHash as Hash | undefined;
  const receiptState = useAuthoritativeReceipt(hash);
  const succeeded = receiptState === "success";
  const reverted = receiptState === "reverted";
  const uncertain = receiptState === "uncertain";
  const pending = receiptState === "pending";

  useEffect(() => {
    if (succeeded || reverted) router.refresh();
  }, [reverted, router, succeeded]);

  useEffect(() => {
    if (!hash) return;
    const receiptState = succeeded
      ? "success"
      : reverted
        ? "reverted"
        : uncertain
          ? "uncertain"
          : "pending";
    const observationKey = `${hash}:${receiptState}`;
    if (reportedObservation.current === observationKey) return;
    reportedObservation.current = observationKey;
    // Operational activity never controls the collector's receipt-derived UI.
    void reportMintTransaction(hash).catch(() => undefined);
  }, [hash, reverted, succeeded, uncertain]);

  const connectWallet = () => {
    window.dispatchEvent(new Event("pigverse:open-wallet"));
  };

  const beginMint = async () => {
    if (!deployment || !connection.address || !publicClient) return;
    if (storageKey && reverted) writePendingMint(storageKey, undefined);
    setError(undefined);
    setPreparing(true);
    try {
      const contract = deployment.contract;
      const tokenId = BigInt(token.tokenId);
      const [paused, price, revision, uri] = await Promise.all([
        publicClient.readContract({
          abi: genesisAbi,
          address: contract,
          functionName: "paused",
        }),
        publicClient.readContract({
          abi: genesisAbi,
          address: contract,
          functionName: "mintPrice",
        }),
        publicClient.readContract({
          abi: genesisAbi,
          address: contract,
          args: [tokenId],
          functionName: "publicationRevision",
        }),
        publicClient.readContract({
          abi: genesisAbi,
          address: contract,
          args: [tokenId],
          functionName: "publishedURI",
        }),
      ]);
      if (paused) throw new MintPreflightError("paused");
      if (!uri) throw new MintPreflightError("unpublished");
      await publicClient.simulateContract({
        abi: genesisAbi,
        account: connection.address,
        address: contract,
        args: [tokenId, revision],
        functionName: "mint",
        value: price,
      });
      setPreparing(false);
      const submittedHash = await writeContract.mutateAsync({
        abi: genesisAbi,
        address: contract,
        args: [tokenId, revision],
        chainId: targetChain.id,
        functionName: "mint",
        value: price,
      });
      writePendingMint(
        pendingMintKey({
          account: connection.address,
          chainId: deployment.chainId,
          contract,
          tokenId: token.tokenId,
        }),
        submittedHash,
      );
    } catch (cause) {
      setPreparing(false);
      if (cause instanceof MintPreflightError && cause.reason === "paused") {
        setError(
          vi ? "Mint đang tạm dừng on-chain." : "Minting is paused on-chain.",
        );
      } else if (
        cause instanceof MintPreflightError &&
        cause.reason === "unpublished"
      ) {
        setError(
          vi
            ? "NFT này hiện chưa được công bố để mint."
            : "This NFT is not currently published for minting.",
        );
      } else {
        setError(
          vi
            ? "Giao dịch chưa được gửi hoặc trạng thái NFT đã thay đổi. Hãy làm mới và thử lại."
            : "The transaction was not submitted or the NFT state changed. Refresh and try again.",
        );
      }
      router.refresh();
    }
  };

  if (succeeded) {
    return (
      <div className="pv-mint-panel pv-mint-panel--success" role="status">
        <Icon name="check" />
        <strong>{vi ? "Mint đã xác nhận!" : "Mint confirmed!"}</strong>
        <p>
          {vi
            ? `${token.name} #${token.tokenId} đã được xác nhận thuộc ví ${connection.address}.`
            : `${token.name} #${token.tokenId} is confirmed for wallet ${connection.address}.`}
        </p>
        {hash && (
          <a
            className="pv-mint-panel__transaction"
            href={`https://sepolia.basescan.org/tx/${hash}`}
            rel="noreferrer"
            target="_blank"
          >
            {vi ? "Xem giao dịch" : "View transaction"}
          </a>
        )}
        <div className="pv-button-row">
          <Link
            className="pv-button pv-button--secondary pv-button--sm"
            href="/my-nfts"
            onClick={() => {
              if (storageKey) writePendingMint(storageKey, undefined);
            }}
          >
            {vi ? "NFT của tôi" : "My NFTs"}
          </Link>
          <Link
            className="pv-button pv-button--ghost pv-button--sm"
            href="/collection"
            onClick={() => {
              if (storageKey) writePendingMint(storageKey, undefined);
            }}
          >
            {vi ? "Bộ sưu tập" : "Collection"}
          </Link>
        </div>
      </div>
    );
  }

  if (!hash && (!deployment || token.status === "unknown")) {
    return (
      <div className="pv-mint-panel pv-mint-panel--muted">
        <strong>{vi ? "Mint chưa khả dụng" : "Mint unavailable"}</strong>
        <p>
          {vi
            ? "Cần xác minh contract và trạng thái on-chain trước khi mint."
            : "The contract and on-chain state must be verified before minting."}
        </p>
      </div>
    );
  }

  if (!hash && (token.status === "minted" || token.status === "coming-soon"))
    return null;

  if (!hash && token.status === "paused") {
    return (
      <div className="pv-mint-panel pv-mint-panel--muted">
        <strong>{vi ? "Mint đang tạm dừng" : "Minting paused"}</strong>
        <p>
          {vi
            ? "Bạn vẫn có thể xem toàn bộ bộ sưu tập."
            : "The full collection remains available to browse."}
        </p>
      </div>
    );
  }

  return (
    <div className="pv-mint-panel">
      <div>
        <strong>{vi ? "Mint NFT này" : "Mint this NFT"}</strong>
        <p>
          {vi
            ? "Giá và trạng thái sẽ được đọc lại từ contract trước khi ví xác nhận."
            : "Price and availability are re-read from the contract before wallet confirmation."}
        </p>
      </div>
      {pending || (Boolean(hash) && uncertain) ? (
        <Button aria-busy={pending || undefined} disabled size="lg">
          {uncertain
            ? vi
              ? "Kết quả chưa xác định"
              : "Outcome unknown"
            : vi
              ? "Đang chờ xác nhận…"
              : "Awaiting confirmation…"}
        </Button>
      ) : connection.status !== "connected" ? (
        <Button onClick={connectWallet} size="lg">
          {vi ? "Kết nối ví để mint" : "Connect wallet to mint"}
        </Button>
      ) : !correctNetwork ? (
        <Button
          disabled={switchChain.isPending}
          onClick={() => switchChain.mutate({ chainId: targetChain.id })}
          size="lg"
          variant="secondary"
        >
          {vi ? "Chuyển sang Base Sepolia" : "Switch to Base Sepolia"}
        </Button>
      ) : (
        <Button
          aria-busy={preparing || writeContract.isPending}
          disabled={preparing || writeContract.isPending}
          onClick={beginMint}
          size="lg"
        >
          {preparing
            ? vi
              ? "Đang kiểm tra on-chain…"
              : "Checking on-chain…"
            : writeContract.isPending
              ? vi
                ? "Xác nhận trong ví…"
                : "Confirm in wallet…"
              : vi
                ? "Mint NFT"
                : "Mint NFT"}
        </Button>
      )}
      {hash && (
        <a
          className="pv-mint-panel__transaction"
          href={`https://sepolia.basescan.org/tx/${hash}`}
          rel="noreferrer"
          target="_blank"
        >
          {uncertain
            ? vi
              ? "Chưa xác định kết quả · Xem giao dịch"
              : "Outcome unknown · View transaction"
            : vi
              ? "Xem giao dịch"
              : "View transaction"}
        </a>
      )}
      {(error || reverted) && (
        <p className="pv-mint-panel__error" role="alert">
          {error ??
            (vi
              ? "Giao dịch đã thất bại; quyền sở hữu không thay đổi."
              : "The transaction failed; ownership did not change.")}
        </p>
      )}
    </div>
  );
}
