import { denied, describeResult, getOrElse, isOk, mapResult, ok, unavailable } from '../result';

describe('Result', () => {
  it('creates ok results', () => {
    const result = ok(41);

    expect(result).toEqual({ status: 'ok', value: 41 });
    expect(isOk(result)).toBe(true);
  });

  it('creates unavailable results with a developer-facing reason', () => {
    const result = unavailable<number>('Battery temperature is not exposed by the OS');

    expect(result.status).toBe('unavailable');
    expect(isOk(result)).toBe(false);
  });

  it('creates denied results with the permission name', () => {
    const result = denied<string>('android.permission.NEARBY_WIFI_DEVICES');

    expect(result).toEqual({
      status: 'denied',
      permission: 'android.permission.NEARBY_WIFI_DEVICES',
    });
  });

  it('maps only ok values and passes other states through', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ status: 'ok', value: 6 });

    const miss = unavailable<number>('no sensor');
    expect(mapResult(miss, (n) => n * 3)).toBe(miss);
  });

  it('returns a fallback for non-ok values', () => {
    expect(getOrElse(ok('a'), 'b')).toBe('a');
    expect(getOrElse(unavailable<string>('nope'), 'b')).toBe('b');
    expect(getOrElse(denied<string>('android.permission.X'), 'b')).toBe('b');
  });

  it('describes non-ok results with the user-facing copy from the brief', () => {
    expect(describeResult(ok(1))).toBeNull();
    expect(describeResult(unavailable<number>('why'))).toBe('Not available on this device');
    expect(describeResult(denied<number>('android.permission.X'))).toBe('Permission denied');
  });
});
