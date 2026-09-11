import { describe, expect, it } from "vitest";

import { isLocale, translate } from "./i18n";

describe("localization foundation", () => {
  it("recognizes only supported locales", () => {
    expect(isLocale("vi")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("provides matching keys for VI and EN", () => {
    expect(translate("vi", "wallet.connect")).toBe("Kết nối ví");
    expect(translate("en", "wallet.connect")).toBe("Connect Wallet");
  });
});
