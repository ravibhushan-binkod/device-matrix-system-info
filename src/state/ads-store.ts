import { create } from 'zustand';

/**
 * Where the ads stack is in its startup sequence.
 *
 * - `idle`     — bootstrap has not run yet (fresh launch).
 * - `running`  — gathering consent / initialising the Mobile Ads SDK.
 * - `ready`    — consent allows ad requests and the SDK is initialised.
 * - `blocked`  — consent was gathered but ad requests are not allowed.
 * - `error`    — consent/SDK startup failed (offline, etc.). Banners stay off.
 * - `disabled` — the `ads` feature flag is off; nothing ever initialises.
 */
export type AdsStatus = 'idle' | 'running' | 'ready' | 'blocked' | 'error' | 'disabled';

type AdsState = {
  status: AdsStatus;
  /** The last startup failure message, for the debug-only developer tools. */
  lastError: string | null;
  setStatus: (status: AdsStatus, error?: string | null) => void;
};

/**
 * Ads readiness. Banners only mount when `status === 'ready'`, which is what
 * guarantees no ad request can happen before consent allows it.
 */
export const useAdsStore = create<AdsState>((set) => ({
  status: 'idle',
  lastError: null,
  setStatus: (status, error = null) => set({ status, lastError: error }),
}));
