import { useRouter } from 'expo-router';

import { TipCard } from '@/design-system/components';
import { tipIcon, tipTone } from '@/features/tips/components/tip-visuals';
import { useTipsSummary } from '@/features/tips/hooks/use-tips-summary';

/**
 * The Home tip slot: the top finding from a fresh check-up (or the all-good
 * state). Tapping it opens the full Tips screen.
 */
export function HomeTipCard() {
  const router = useRouter();
  const report = useTipsSummary();

  if (!report) return null;

  const open = () => router.push('/tips');
  const top = report.tips[0] ?? null;

  if (!top) {
    return (
      <TipCard
        tone="good"
        icon="check"
        title="All good"
        body="The last check-up found nothing worth fixing on this device."
        hint="Tap to run it again"
        onPress={open}
      />
    );
  }

  const rest = report.tips.length - 1;

  return (
    <TipCard
      tone={tipTone(top.severity)}
      icon={tipIcon(top.id)}
      title={top.title}
      body={top.body}
      hint={
        rest > 0
          ? `${rest} more ${rest === 1 ? 'tip' : 'tips'} — tap to see all`
          : 'Tap to run the full check-up'
      }
      onPress={open}
    />
  );
}
