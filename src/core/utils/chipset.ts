export type ChipsetInput = {
  socManufacturer: string | null;
  socModel: string | null;
  /** `Build.HARDWARE` — the only value older Android versions expose. */
  hardware: string;
};

/** Marketing chipset name from `Build.SOC_*`; falls back to `Build.HARDWARE`. */
export function chipsetLabel(input: ChipsetInput): string | null {
  const parts = [input.socManufacturer, input.socModel].filter(
    (part): part is string => part != null && part.length > 0,
  );
  if (parts.length > 0) return parts.join(' ');
  const hardware = input.hardware.trim();
  return hardware.length > 0 ? hardware : null;
}
