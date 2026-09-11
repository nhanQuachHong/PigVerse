"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { PigverseLogo } from "../brand/pigverse-logo";
import { Icon } from "../ui/icon";

const adminNav = [
  "Dashboard",
  "NFT Management",
  "Asset Processing",
  "Minting",
  "Settings",
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="pv-admin-shell">
      <aside
        className={`pv-admin-sidebar ${navOpen ? "pv-admin-sidebar--open" : ""}`}
      >
        <PigverseLogo />
        <nav aria-label="Admin navigation">
          {adminNav.map((item, index) => (
            <Link
              aria-current={index === 0 ? "page" : undefined}
              href={
                index === 0
                  ? "/admin"
                  : `/admin#${item.toLowerCase().replaceAll(" ", "-")}`
              }
              key={item}
              onClick={() => setNavOpen(false)}
            >
              <span aria-hidden="true" className="pv-admin-nav-icon">
                {index === 0 ? "⌂" : "·"}
              </span>
              {item}
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
            aria-label={
              navOpen ? "Close admin navigation" : "Open admin navigation"
            }
            className="pv-admin-menu-toggle"
            onClick={() => setNavOpen((open) => !open)}
            type="button"
          >
            <Icon name={navOpen ? "close" : "menu"} size={20} />
          </button>
          <span className="pv-admin-search">
            <Icon name="chevron" size={18} />
            Admin foundation
          </span>
          <span className="pv-admin-user">
            <span className="pv-admin-user__avatar">🐷</span>
            0x12ab…3f56
          </span>
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
