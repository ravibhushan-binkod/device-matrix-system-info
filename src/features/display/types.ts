export type DisplayModeRow = {
  key: string;
  /** e.g. "1084 × 2412 · 120 Hz". */
  label: string;
};

export type DisplayModeRows = {
  rows: DisplayModeRow[];
  /** Modes beyond the shown cap. */
  hiddenCount: number;
};
