"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { PigverseLogo } from "../brand/pigverse-logo";
import { Icon } from "../ui/icon";
import { PageContainer } from "../ui/page-container";
import { WalletButton } from "../ui/wallet-button";

const navItems = [
  { href: "/", key: "nav.home" },
  { href: "/collection", key: "nav.collection" },
  { href: "/story", key: "nav.story" },
  { href: "/my-nfts", key: "nav.myNfts" },
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="pv-public-shell">
      <header className="pv-public-header">
        <PageContainer className="pv-public-header__inner">
          <PigverseLogo compact />
          <nav
            aria-label="Primary navigation"
            className={`pv-public-nav ${menuOpen ? "pv-public-nav--open" : ""}`}
          >
            {navItems.map((item) => (
              <Link
                aria-current={pathname === item.href ? "page" : undefined}
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
            <div
              aria-label="Language"
              className="pv-public-nav__locale"
              role="group"
            >
              <button
                aria-pressed={locale === "vi"}
                onClick={() => setLocale("vi")}
                type="button"
              >
                VI
              </button>
              <span aria-hidden="true">/</span>
              <button
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
                type="button"
              >
                EN
              </button>
            </div>
          </nav>
          <div className="pv-public-header__actions">
            <div
              aria-label="Language"
              className="pv-locale-switcher"
              role="group"
            >
              <button
                aria-pressed={locale === "vi"}
                onClick={() => setLocale("vi")}
                type="button"
              >
                VI
              </button>
              <span aria-hidden="true">/</span>
              <button
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
                type="button"
              >
                EN
              </button>
            </div>
            <WalletButton />
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t("nav.close") : t("nav.open")}
              className="pv-nav-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <Icon name={menuOpen ? "close" : "menu"} size={24} />
            </button>
          </div>
        </PageContainer>
      </header>
      <main id="main-content">{children}</main>
      <footer className="pv-footer">
        <PageContainer className="pv-footer__inner">
          <PigverseLogo compact />
          <p>Genesis Collection · 10 NFTs</p>
          <p>
            {locale === "vi"
              ? "Mạng mục tiêu · Base Sepolia"
              : "Target network · Base Sepolia"}
          </p>
        </PageContainer>
      </footer>
    </div>
  );
}
