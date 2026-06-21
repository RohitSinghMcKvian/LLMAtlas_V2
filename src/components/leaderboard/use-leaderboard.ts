"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncPayload } from "@/lib/leaderboard";

const REFRESH_MS = 5 * 60 * 1000; // auto-refresh every 5 min

export interface LeaderboardSync extends SyncPayload {
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

const INITIAL: SyncPayload = {
  updatedAt: new Date().toISOString(),
  source: "fallback",
  liveModelCount: 0,
  priceOverrides: {},
  newModels: [],
  globalModels: [],
};

/**
 * Fetches /api/leaderboard on mount, then auto-refreshes every 5 min and on
 * window focus. Degrades silently to the bundled catalogue (source:"fallback")
 * when the network or upstream is unavailable.
 */
export function useLeaderboardSync(): LeaderboardSync {
  const [data, setData] = useState<SyncPayload>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inflight = useRef(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (inflight.current) return;
    inflight.current = true;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as SyncPayload;
        setData(json);
      }
    } catch {
      /* keep last-known / fallback */
    } finally {
      inflight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), REFRESH_MS);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return { ...data, loading, refreshing, refresh: () => load(true) };
}
