"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useConnection, useSignMessage, useSwitchChain } from "wagmi";

import { type AdminSession, adminSessionQuery } from "../../lib/admin-session";
import { targetChain, targetContractAddress } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { AdminContentPanel } from "./admin-content-panel";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { PageContainer } from "../ui/page-container";
import { SectionHeading } from "../ui/section-heading";

type Challenge = { message: string; nonce: string };

function isChallenge(value: unknown): value is Challenge {
  if (!value || typeof value !== "object") return false;
  const challenge = value as Record<string, unknown>;
  return (
    typeof challenge.message === "string" && typeof challenge.nonce === "string"
  );
}

function openWallet() {
  window.dispatchEvent(new Event("pigverse:open-wallet"));
}

export function AdminAccessView() {
  const { t } = useLocale();
  const connection = useConnection();
  const session = useQuery(adminSessionQuery);
  const queryClient = useQueryClient();
  const signMessage = useSignMessage();
  const switchChain = useSwitchChain();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const connected = connection.status === "connected" && connection.address;
  const correctNetwork = connection.chainId === targetChain.id;

  const signIn = async () => {
    if (!connected || !correctNetwork) return;
    setBusy(true);
    setError(false);
    try {
      const challengeResponse = await fetch("/api/admin/auth/challenge", {
        body: JSON.stringify({ address: connection.address }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const challenge: unknown = await challengeResponse.json();
      if (!challengeResponse.ok || !isChallenge(challenge))
        throw new Error("ADMIN_AUTH_DENIED");
      const signature = await signMessage.mutateAsync({
        message: challenge.message,
      });
      const verifyResponse = await fetch("/api/admin/auth/verify", {
        body: JSON.stringify({
          message: challenge.message,
          nonce: challenge.nonce,
          signature,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const verified: unknown = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error("ADMIN_AUTH_DENIED");
      const nextSession = verified as Record<string, unknown>;
      if (
        typeof nextSession.walletAddress !== "string" ||
        !/^0x[0-9a-fA-F]{40}$/.test(nextSession.walletAddress) ||
        typeof nextSession.expiresAt !== "string" ||
        Number.isNaN(Date.parse(nextSession.expiresAt))
      )
        throw new Error("ADMIN_AUTH_INVALID_RESPONSE");
      const authenticatedSession: AdminSession = {
        authenticated: true,
        expiresAt: nextSession.expiresAt,
        walletAddress: nextSession.walletAddress as `0x${string}`,
      };
      queryClient.setQueryData(
        adminSessionQuery.queryKey,
        authenticatedSession,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/auth/session", {
        credentials: "same-origin",
        method: "DELETE",
      });
      if (!response.ok) throw new Error("ADMIN_AUTH_UNAVAILABLE");
      queryClient.setQueryData<AdminSession>(adminSessionQuery.queryKey, {
        authenticated: false,
      });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (session.isPending)
    return (
      <PageContainer className="pv-admin-access">
        <Card aria-busy="true" className="pv-admin-access-card">
          <span className="pv-skeleton pv-skeleton--title" />
          <span className="pv-skeleton pv-skeleton--text" />
        </Card>
      </PageContainer>
    );

  if (session.data?.authenticated) {
    const accountMismatch =
      !!connection.address &&
      connection.address.toLowerCase() !==
        session.data.walletAddress.toLowerCase();
    return (
      <PageContainer className="pv-admin-foundation">
        <SectionHeading
          action={
            <Button disabled={busy} onClick={signOut} size="sm" variant="ghost">
              {t("admin.signOut")}
            </Button>
          }
          as="h1"
          description={t("admin.dashboardDescription")}
          eyebrow={t("admin.ownerVerified")}
          title={t("admin.dashboardTitle")}
        />
        {accountMismatch && (
          <div
            className="pv-admin-notice pv-admin-notice--warning"
            role="alert"
          >
            <Icon name="alert" size={20} />
            <p>{t("admin.accountMismatch")}</p>
          </div>
        )}
        <div className="pv-admin-stat-grid">
          <Card>
            <strong>10</strong>
            <span>{t("admin.genesisSupply")}</span>
          </Card>
          <Card>
            <strong>1/1</strong>
            <span>{t("admin.identityRule")}</span>
          </Card>
          <Card>
            <strong>{targetChain.name}</strong>
            <span>{t("admin.activeNetwork")}</span>
          </Card>
          <Card>
            <strong className="pv-admin-wallet-value">
              {session.data.walletAddress.slice(0, 6)}…
              {session.data.walletAddress.slice(-4)}
            </strong>
            <span>{t("admin.currentOwner")}</span>
          </Card>
        </div>
        <AdminContentPanel
          contractAddress={targetContractAddress}
          ownerWallet={session.data.walletAddress}
        />
        {error && (
          <p className="pv-admin-error" role="alert">
            {t("admin.error")}
          </p>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pv-admin-access">
      <Card className="pv-admin-access-card">
        <span className="pv-admin-access-card__icon" aria-hidden="true">
          🐷
        </span>
        <p className="pv-eyebrow">{t("admin.secureAccess")}</p>
        <h1>{t("admin.signInTitle")}</h1>
        <p>{t("admin.signInDescription")}</p>
        <div
          className="pv-admin-access-card__steps"
          aria-label={t("admin.stepsLabel")}
        >
          <span>1 · {t("admin.stepConnect")}</span>
          <span>2 · {t("admin.stepSign")}</span>
          <span>3 · {t("admin.stepVerify")}</span>
        </div>
        {session.isError && (
          <div
            className="pv-admin-notice pv-admin-notice--warning"
            role="alert"
          >
            <Icon name="alert" size={20} />
            <p>{t("admin.unavailable")}</p>
          </div>
        )}
        {!connected ? (
          <Button onClick={openWallet} size="lg">
            <Icon name="wallet" size={19} /> {t("wallet.connect")}
          </Button>
        ) : !correctNetwork ? (
          <Button
            disabled={switchChain.isPending}
            onClick={() => switchChain.mutate({ chainId: targetChain.id })}
            size="lg"
            variant="secondary"
          >
            {switchChain.isPending
              ? t("wallet.switching")
              : t("wallet.switchNetwork")}
          </Button>
        ) : (
          <Button disabled={busy || session.isError} onClick={signIn} size="lg">
            {busy ? t("admin.signingIn") : t("admin.signMessage")}
          </Button>
        )}
        <p className="pv-admin-access-card__safety">
          {t("admin.noTransaction")}
        </p>
        {error && (
          <p className="pv-admin-error" role="alert">
            {t("admin.error")}
          </p>
        )}
      </Card>
    </PageContainer>
  );
}
