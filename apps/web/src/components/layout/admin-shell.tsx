"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { adminSessionQuery } from "../../lib/admin-session";
import { PigverseLogo } from "../brand/pigverse-logo";
import { useLocale } from "../i18n/locale-provider";
import { Icon } from "../ui/icon";
import { WalletControl } from "../web3/wallet-control";

const adminNav = [
  ["admin.navDashboard", "dashboard"],
  ["admin.navNfts", "nft-management"],
  ["admin.navAssets", "asset-processing"],
  ["admin.navMinting", "minting"],
  ["admin.navSettings", "settings"],
] as const;

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const session = useQuery(adminSessionQuery);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="pv-admin-shell">
      <aside
        className={`pv-admin-sidebar ${navOpen ? "pv-admin-sidebar--open" : ""}`}
      >
        <PigverseLogo />
        <nav aria-label={t("admin.navLabel")}>
          {adminNav.map(([label, fragment], index) => (
            <Link
              aria-current={index === 0 ? "page" : undefined}
              href={index === 0 ? "/admin" : `/admin#${fragment}`}
              key={label}
              onClick={() => setNavOpen(false)}
            >
              <span aria-hidden="true" className="pv-admin-nav-icon">
                {index === 0 ? "⌂" : "·"}
              </span>
              {t(label)}
            </Link>
          ))}
        </nav>
      </aside>
      {navOpen && (
        <button
          aria-hidden="true"
          className="pv-admin-sidebar-backdrop"
          onClick={() => setNavOpen(false)}
          tabIndex={-1}
          type="button"
        />
      )}
      <div className="pv-admin-main">
        <header className="pv-admin-header">
          <button
            aria-expanded={navOpen}
            aria-label={navOpen ? t("admin.navClose") : t("admin.navOpen")}
            className="pv-admin-menu-toggle"
            onClick={() => setNavOpen((open) => !open)}
            type="button"
          >
            <Icon name={navOpen ? "close" : "menu"} size={20} />
          </button>
          <span className="pv-admin-search">
            <Icon name="chevron" size={18} /> {t("admin.header")}
          </span>
          <div className="pv-admin-header__actions">
            {session.data?.authenticated && (
              <span className="pv-admin-user">
                <span className="pv-admin-user__avatar">🐷</span>
                {shortAddress(session.data.walletAddress)}
              </span>
            )}
            <WalletControl />
          </div>
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
