import { getBatteryInfo, getThermalStatus, type BatteryReading } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import {
  readThermalInfo,
  thermalLoadPercent,
  thermalStatusTone,
} from '@/features/thermal/services/thermal-service';

jest.mock('@/core/native', () => ({
  getBatteryInfo: jest.fn(),
  getThermalStatus: jest.fn(),
}));

const thermalMock = jest.mocked(getThermalStatus);
const batteryMock = jest.mocked(getBatteryInfo);

const battery: BatteryReading = {
  level: 61,
  percent: 61,
  status: 'charging',
  plugged: 'usb',
  health: 'good',
  temperatureC: 38.4,
  voltageMv: 4050,
  technology: 'Li-ion',
  currentNowUa: 350_000,
  chargeCounterUah: 2_500_000,
  cycleCount: null,
  powerSave: false,
};

describe('thermalLoadPercent', () => {
  it('maps headroom to load', () => {
    expect(thermalLoadPercent(0.4)).toBe(60);
    expect(thermalLoadPercent(0.72)).toBe(28);
    expect(thermalLoadPercent(0)).toBe(100);
    expect(thermalLoadPercent(1)).toBe(0);
  });

  it('clamps headroom above one to a load of zero', () => {
    expect(thermalLoadPercent(1.2)).toBe(0);
  });

  it('returns null when the headroom is missing', () => {
    expect(thermalLoadPercent(null)).toBeNull();
    expect(thermalLoadPercent(Number.NaN)).toBeNull();
  });
});

describe('thermalStatusTone', () => {
  it('maps the thermal statuses', () => {
    expect(thermalStatusTone('none')).toBe('good');
    expect(thermalStatusTone('light')).toBe('good');
    expect(thermalStatusTone('moderate')).toBe('warning');
    expect(thermalStatusTone('severe')).toBe('warning');
    expect(thermalStatusTone('critical')).toBe('critical');
    expect(thermalStatusTone('emergency')).toBe('critical');
    expect(thermalStatusTone('shutdown')).toBe('critical');
  });

  it('treats unknown or missing statuses as good', () => {
    expect(thermalStatusTone('unknown')).toBe('good');
    expect(thermalStatusTone(null)).toBe('good');
  });
});

describe('readThermalInfo', () => {
  it('passes an unavailable thermal reading through', () => {
    thermalMock.mockReturnValue(unavailable('No thermal status on this device.'));
    expect(readThermalInfo()).toEqual(unavailable('No thermal status on this device.'));
  });

  it('assembles the reading and keeps the battery temperature optional', () => {
    thermalMock.mockReturnValue(
      ok({ status: 'light', statusCode: 1, headroom: 0.6, headroomForecastSeconds: 10 }),
    );
    batteryMock.mockReturnValue(unavailable('No battery service.'));
    expect(readThermalInfo()).toEqual(
      ok({
        statusLabel: 'Light',
        tone: 'good',
        loadPercent: 40,
        headroomPercent: 60,
        batteryTemperatureC: null,
      }),
    );
  });

  it('includes the battery temperature and a warning tone when reported', () => {
    thermalMock.mockReturnValue(
      ok({ status: 'moderate', statusCode: 2, headroom: 0.5, headroomForecastSeconds: 10 }),
    );
    batteryMock.mockReturnValue(ok(battery));
    const result = readThermalInfo();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.tone).toBe('warning');
    expect(result.value.batteryTemperatureC).toBe(38.4);
  });
});
