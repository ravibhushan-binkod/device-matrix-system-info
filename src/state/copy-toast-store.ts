import { create } from 'zustand';

type CopyToastState = {
  message: string | null;
  /** Changes on every copy, so repeated copies restart the toast timer. */
  token: number;
  show: (message: string) => void;
  hide: () => void;
};

/** Global, transient clipboard feedback. Nothing is persisted. */
export const useCopyToastStore = create<CopyToastState>((set) => ({
  message: null,
  token: 0,
  show: (message) => set((state) => ({ message, token: state.token + 1 })),
  hide: () => set({ message: null }),
}));
