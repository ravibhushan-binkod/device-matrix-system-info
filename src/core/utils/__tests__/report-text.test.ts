import { buildReportText } from '@/core/utils/report-text';

describe('buildReportText', () => {
  const sections = [
    {
      title: 'OS',
      entries: [
        { label: 'Android version', value: '16' },
        { label: 'Kernel', value: null },
      ],
    },
    {
      title: 'Kernel & boot',
      entries: [{ label: 'Bootloader', value: 'unknown' }],
    },
  ];

  it('renders sections, entries and the unavailable marker', () => {
    expect(buildReportText(sections)).toBe(
      [
        'OS',
        '- Android version: 16',
        '- Kernel: Not available on this device',
        '',
        'KERNEL & BOOT',
        '- Bootloader: unknown',
      ].join('\n'),
    );
  });

  it('prepends an optional header', () => {
    expect(buildReportText(sections, 'Device Matrix: System info')).toContain(
      'Device Matrix: System info\n\nOS',
    );
  });

  it('handles an empty section list', () => {
    expect(buildReportText([], 'Only a header')).toBe('Only a header');
    expect(buildReportText([])).toBe('');
  });
});
