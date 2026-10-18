import { PlaceholderScreen } from '@/design-system/components';
import { HardwareIcon } from '@/design-system/icons';

export default function HardwareScreen() {
  return (
    <PlaceholderScreen
      icon={HardwareIcon}
      title="Hardware"
      description="CPU/GPU, memory, storage, battery, thermal, display, camera and sensors each get an honest section as their phases land."
    />
  );
}
