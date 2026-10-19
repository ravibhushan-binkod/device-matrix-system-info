export type MatrixEntry = {
  key: string;
  /** Section-qualified label, e.g. "CPU · Governor" or "Back camera · ISO range". */
  label: string;
  /** Formatted reading; `null` means the device did not return it. */
  value: string | null;
  /** Why the reading is unavailable (set only when `value` is `null`). */
  note: string | null;
};

export type MatrixSection = {
  key: string;
  title: string;
  entries: MatrixEntry[];
};

export type MatrixSummary = {
  ok: number;
  unavailable: number;
};
