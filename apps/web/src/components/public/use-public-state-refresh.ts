"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function usePublicStateRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lastRefresh = useRef(-Infinity);
  const refresh = useCallback(() => {
    if (!pending) startTransition(() => router.refresh());
  }, [pending, router]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState !== "visible" || pending) return;
      const now = Date.now();
      if (now - lastRefresh.current < 1000) return;
      lastRefresh.current = now;
      refresh();
    };
    const timer = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [pending, refresh]);

  return { refresh, pending };
}
