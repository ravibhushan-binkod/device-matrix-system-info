import type { SensorDescriptor } from '@/core/native';
import {
  fifoLabel,
  filterSensorRows,
  formatSensorPower,
  formatSensorValue,
  reportingModeLabel,
  samplingRateLabel,
  sensorDetailValues,
  sensorFrequencyHz,
  sensorLabel,
  toSensorRows,
  vectorMagnitude,
} from '@/features/sensors/services/sensor-service';

jest.mock('@/core/native', () => ({
  getSensors: jest.fn(),
}));

function sensor(overrides: Partial<SensorDescriptor> = {}): SensorDescriptor {
  return {
    type: 1,
    name: 'LSM6DSO Accelerometer',
    vendor: 'STMicroelectronics',
    version: 1,
    stringType: 'android.sensor.accelerometer',
    maxRange: 78.45,
    resolution: 0.002,
    powerMa: 0.15,
    minDelayUs: 5000,
    maxDelayUs: 200_000,
    fifoMaxEventCount: 3000,
    fifoReservedEventCount: 1500,
    isWakeUp: false,
    reportingMode: 'continuous',
    ...overrides,
  };
}

describe('sensorLabel', () => {
  it('maps common Android sensor string types', () => {
    expect(sensorLabel(sensor())).toBe('Accelerometer');
    expect(sensorLabel(sensor({ stringType: 'android.sensor.magnetic_field' }))).toBe(
      'Magnetometer',
    );
    expect(sensorLabel(sensor({ stringType: 'android.sensor.step_counter' }))).toBe('Step counter');
  });

  it('falls back to the device sensor name for unknown or missing types', () => {
    expect(sensorLabel(sensor({ stringType: 'vendor.custom.thing' }))).toBe(
      'LSM6DSO Accelerometer',
    );
    expect(sensorLabel(sensor({ stringType: null }))).toBe('LSM6DSO Accelerometer');
  });
});

describe('toSensorRows and filterSensorRows', () => {
  const rows = toSensorRows([
    sensor(),
    sensor({
      type: 5,
      name: 'Ambient Light Sensor',
      vendor: 'Nothing',
      stringType: 'android.sensor.light',
      isWakeUp: true,
    }),
  ]);

  it('builds rows with searchable text', () => {
    expect(rows[0]).toMatchObject({ type: 1, label: 'Accelerometer', wakeUp: false });
    expect(rows[0]?.searchText).toContain('accelerometer');
    expect(rows[0]?.searchText).toContain('stmicroelectronics');
    expect(rows[1]?.wakeUp).toBe(true);
  });

  it('filters by label, name or vendor, case-insensitively', () => {
    expect(filterSensorRows(rows, 'light')).toHaveLength(1);
    expect(filterSensorRows(rows, 'stmicro')).toHaveLength(1);
    expect(filterSensorRows(rows, 'NOTHING')).toHaveLength(1);
    expect(filterSensorRows(rows, '  ')).toHaveLength(2);
    expect(filterSensorRows(rows, 'camera')).toHaveLength(0);
  });
});

describe('formatSensorValue', () => {
  it('scales precision to the magnitude', () => {
    expect(formatSensorValue(1234.5678)).toBe('1235');
    expect(formatSensorValue(78.45)).toBe('78.5');
    expect(formatSensorValue(9.81)).toBe('9.81');
    expect(formatSensorValue(0.002)).toBe('0.002');
    expect(formatSensorValue(Number.NaN)).toBe('—');
  });
});

describe('sensorDetailValues', () => {
  it('labels three values as axes', () => {
    expect(sensorDetailValues([1, 2, 3])).toEqual([
      { key: 'axis-0', label: 'X', value: '1.00' },
      { key: 'axis-1', label: 'Y', value: '2.00' },
      { key: 'axis-2', label: 'Z', value: '3.00' },
    ]);
  });

  it('labels one value and empty input', () => {
    expect(sensorDetailValues([42])).toEqual([{ key: 'value', label: 'Value', value: '42.0' }]);
    expect(sensorDetailValues([])).toEqual([{ key: 'value', label: 'Value', value: '—' }]);
  });

  it('numbers other value counts', () => {
    expect(sensorDetailValues([1, 2, 3, 4, 5]).map((value) => value.label)).toEqual([
      'V1',
      'V2',
      'V3',
      'V4',
      'V5',
    ]);
  });
});

describe('vectorMagnitude', () => {
  it('computes the 3D magnitude', () => {
    expect(vectorMagnitude([3, 4, 0])).toBe(5);
  });

  it('uses the absolute value for single values', () => {
    expect(vectorMagnitude([-42])).toBe(42);
  });

  it('returns null for empty input', () => {
    expect(vectorMagnitude([])).toBeNull();
  });
});

describe('sensorFrequencyHz', () => {
  it('converts the sampling delay to Hz', () => {
    expect(sensorFrequencyHz(5000)).toBe(200);
    expect(sensorFrequencyHz(60_000)).toBe(17);
  });

  it('returns null for one-shot sensors', () => {
    expect(sensorFrequencyHz(0)).toBeNull();
  });
});

describe('samplingRateLabel', () => {
  it('spans the slowest to the fastest rate', () => {
    expect(samplingRateLabel(5000, 200_000)).toBe('5 – 200 Hz');
  });

  it('collapses an equal range and keeps single bounds honest', () => {
    expect(samplingRateLabel(5000, 5000)).toBe('200 Hz');
    expect(samplingRateLabel(5000, null)).toBe('up to 200 Hz');
    expect(samplingRateLabel(0, 200_000)).toBe('from 5 Hz');
  });

  it('returns null for one-shot sensors without any rate', () => {
    expect(samplingRateLabel(0, null)).toBeNull();
    expect(samplingRateLabel(0, 0)).toBeNull();
  });
});

describe('fifoLabel', () => {
  it('shows the depth and the reserved events', () => {
    expect(fifoLabel(3000, 1500)).toBe('3000 events · 1500 reserved');
  });

  it('falls back to whichever side is reported', () => {
    expect(fifoLabel(3000, null)).toBe('3000 events');
    expect(fifoLabel(null, 1500)).toBe('1500 reserved');
  });

  it('returns null when the device hides the FIFO', () => {
    expect(fifoLabel(null, null)).toBeNull();
    expect(fifoLabel(0, 0)).toBeNull();
  });
});

describe('formatSensorPower', () => {
  it('formats the power draw', () => {
    expect(formatSensorPower(0.15)).toBe('0.15 mA');
    expect(formatSensorPower(1.5)).toBe('1.5 mA');
    expect(formatSensorPower(0)).toBeNull();
  });
});

describe('reportingModeLabel', () => {
  it('labels the reporting modes', () => {
    expect(reportingModeLabel('continuous')).toBe('Continuous');
    expect(reportingModeLabel('on-change')).toBe('On change');
    expect(reportingModeLabel('one-shot')).toBe('One-shot');
    expect(reportingModeLabel('special')).toBe('Special');
    expect(reportingModeLabel(null)).toBeNull();
  });
});
