import { createMMKV } from 'react-native-mmkv';

/** The single MMKV instance for small local settings (no backend, ever). */
export const storage = createMMKV({ id: 'device-matrix' });

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}
