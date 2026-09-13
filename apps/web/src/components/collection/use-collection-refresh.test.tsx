import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCollectionRefresh } from "./use-collection-refresh";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("collection refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    router.refresh.mockReset();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes an open collection every 30 seconds", () => {
    const { unmount } = renderHook(useCollectionRefresh);
    act(() => vi.advanceTimersByTime(29_999));
    expect(router.refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    unmount();
    act(() => {
      vi.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event("focus"));
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh again while the previous transition is pending", async () => {
    let finish!: () => void;
    router.refresh.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result, unmount } = renderHook(useCollectionRefresh);
    act(() => result.current.refresh());
    expect(result.current.pending).toBe(true);
    act(() => {
      vi.advanceTimersByTime(60_000);
      window.dispatchEvent(new Event("focus"));
      result.current.refresh();
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(result.current.pending).toBe(false);
    unmount();
  });

  it("skips hidden tabs and refreshes on return without duplicate focus reads", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    const { unmount } = renderHook(useCollectionRefresh);
    act(() => vi.advanceTimersByTime(60_000));
    expect(router.refresh).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    unmount();
  });
});
