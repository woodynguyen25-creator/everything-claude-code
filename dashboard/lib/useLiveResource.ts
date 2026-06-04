'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * useLiveResource — the dashboard's shared polling spine.
 *
 * Replaces the per-component `useEffect` + `setInterval` + `fetch` boilerplate
 * scattered across ~16 widgets. All callers pointed at the same URL share ONE
 * in-flight request, ONE cached result, and ONE timer. Polling pauses while the
 * tab is hidden and immediately refetches a stale resource when the tab returns.
 *
 * The hook is deliberately dumb about response shape: it returns the parsed JSON
 * as `T`. Enveloped endpoints type `T = ApiResponse<X>` and read `.data`; raw
 * endpoints type `T = X` directly. This mirrors how the existing widgets already
 * branch on the response.
 */

export interface LiveSnapshot<T> {
  data: T | null;
  error: string | null;
  /** True only until the first settle (success or error). Drives initial skeletons. */
  loading: boolean;
  /** True whenever a request is in flight — initial load, background poll, or manual refresh. Drives per-refresh spinners. */
  isFetching: boolean;
  /** Epoch ms of the last successful load (0 if never). For data-age labels. */
  lastUpdated: number;
}

export interface LiveResourceOptions {
  /** Poll interval in ms. Defaults to 60s. The smallest interval requested for a URL wins. */
  intervalMs?: number;
  /** When false, the hook subscribes to nothing and stays in the initial (loading) state. */
  enabled?: boolean;
}

interface ResourceEntry {
  url: string;
  intervalMs: number;
  snapshot: LiveSnapshot<unknown>;
  subscribers: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  controller: AbortController | null;
  lastFetched: number;
}

const INITIAL: LiveSnapshot<unknown> = { data: null, error: null, loading: true, isFetching: false, lastUpdated: 0 };
const registry = new Map<string, ResourceEntry>();
let visibilityBound = false;

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function getEntry(url: string, intervalMs: number): ResourceEntry {
  let entry = registry.get(url);
  if (!entry) {
    entry = {
      url,
      intervalMs,
      snapshot: INITIAL,
      subscribers: new Set(),
      timer: null,
      controller: null,
      lastFetched: 0,
    };
    registry.set(url, entry);
  } else if (intervalMs < entry.intervalMs) {
    // The most frequent need wins for a shared URL.
    entry.intervalMs = intervalMs;
    if (entry.timer) {
      restartTimer(entry);
    }
  }
  return entry;
}

function patchSnapshot(entry: ResourceEntry, patch: Partial<LiveSnapshot<unknown>>): void {
  entry.snapshot = { ...entry.snapshot, ...patch };
  entry.subscribers.forEach((cb) => cb());
}

async function fetchNow(entry: ResourceEntry): Promise<void> {
  entry.controller?.abort();
  const controller = new AbortController();
  entry.controller = controller;
  entry.lastFetched = Date.now();
  patchSnapshot(entry, { isFetching: true });
  try {
    const response = await fetch(entry.url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      if (controller.signal.aborted) return;
      patchSnapshot(entry, { error: `HTTP ${response.status}`, loading: false, isFetching: false });
      return;
    }
    const json = (await response.json()) as unknown;
    if (controller.signal.aborted) return;
    patchSnapshot(entry, { data: json, error: null, loading: false, isFetching: false, lastUpdated: Date.now() });
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
    // Keep the last good `data` so a transient failure doesn't blank the UI.
    patchSnapshot(entry, { error: err instanceof Error ? err.message : 'fetch failed', loading: false, isFetching: false });
  }
}

function restartTimer(entry: ResourceEntry): void {
  if (entry.timer) clearInterval(entry.timer);
  entry.timer = setInterval(() => void fetchNow(entry), entry.intervalMs);
}

function startPolling(entry: ResourceEntry): void {
  void fetchNow(entry);
  if (!isHidden()) restartTimer(entry);
}

function stopPolling(entry: ResourceEntry): void {
  if (entry.timer) {
    clearInterval(entry.timer);
    entry.timer = null;
  }
  entry.controller?.abort();
  entry.controller = null;
}

function handleVisibilityChange(): void {
  if (isHidden()) {
    // Pause every active poller; keep cached snapshots for instant resume.
    registry.forEach((entry) => {
      if (entry.timer) {
        clearInterval(entry.timer);
        entry.timer = null;
      }
    });
    return;
  }
  // Tab is back: refetch anything stale and resume timers.
  const now = Date.now();
  registry.forEach((entry) => {
    if (entry.subscribers.size === 0) return;
    if (now - entry.lastFetched >= entry.intervalMs) void fetchNow(entry);
    if (!entry.timer) restartTimer(entry);
  });
}

function bindVisibility(): void {
  if (visibilityBound || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityBound = true;
}

function subscribeToResource(url: string, intervalMs: number, callback: () => void): () => void {
  bindVisibility();
  const entry = getEntry(url, intervalMs);
  const wasEmpty = entry.subscribers.size === 0;
  entry.subscribers.add(callback);
  if (wasEmpty) startPolling(entry);
  return () => {
    entry.subscribers.delete(callback);
    if (entry.subscribers.size === 0) stopPolling(entry);
  };
}

function refreshResource(url: string): void {
  const entry = registry.get(url);
  if (entry) void fetchNow(entry);
}

export interface LiveResource<T> extends LiveSnapshot<T> {
  refresh: () => void;
}

export function useLiveResource<T>(
  url: string | null | undefined,
  options: LiveResourceOptions = {},
): LiveResource<T> {
  const intervalMs = options.intervalMs ?? 60_000;
  const enabled = (options.enabled ?? true) && Boolean(url);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!enabled || !url) return () => {};
      return subscribeToResource(url, intervalMs, callback);
    },
    [url, intervalMs, enabled],
  );

  const getSnapshot = useCallback((): LiveSnapshot<T> => {
    if (!enabled || !url) return INITIAL as LiveSnapshot<T>;
    return (registry.get(url)?.snapshot ?? INITIAL) as LiveSnapshot<T>;
  }, [url, enabled]);

  const getServerSnapshot = useCallback((): LiveSnapshot<T> => INITIAL as LiveSnapshot<T>, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = useCallback(() => {
    if (url) refreshResource(url);
  }, [url]);

  return { ...snapshot, refresh };
}
