export type ReportEntry = {
  label: string;
  /** `null` renders as "Not available on this device". */
  value: string | null;
};

export type ReportSection = {
  title: string;
  entries: ReportEntry[];
};

const NOT_AVAILABLE = 'Not available on this device';

/** Marker that replaces an identifying value in a privacy-safe export. */
export const IDENTIFYING_HIDDEN = 'Hidden (identifying detail)';

/**
 * Plain-text report: an optional header, then one block per section with the
 * title and one "- Label: value" line per entry.
 */
export function buildReportText(sections: ReportSection[], header?: string): string {
  const blocks = sections.map((section) => {
    const lines = section.entries.map(
      (entry) => `- ${entry.label}: ${entry.value ?? NOT_AVAILABLE}`,
    );
    return [section.title.toUpperCase(), ...lines].join('\n');
  });
  return [header, ...blocks].filter((block): block is string => block != null).join('\n\n');
}
