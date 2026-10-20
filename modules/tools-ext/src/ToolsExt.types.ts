export type NativeClockLaunch = {
  launched: boolean;
  /** 'no-handler' | 'blocked' | 'failed' | null */
  reason: string | null;
};
