import { setActiveUnits } from '@/core/units/active';
import { resolveUnits } from '@/core/units/resolve';
import { DEFAULT_UNIT_PREFERENCES } from '@/core/units/types';

/**
 * Tests run with the metric (en-GB) resolution unless a test passes units
 * explicitly, so a reading like "38 °C" never depends on the machine running
 * Jest. US-region behaviour is covered by the units tests themselves.
 */
setActiveUnits(resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-GB'));
