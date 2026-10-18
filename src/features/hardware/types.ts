/** The hardware hub shows one live card per area, all from a single summary read. */
export type HubKey =
  | 'device'
  | 'cpu'
  | 'thermal'
  | 'memory'
  | 'storage'
  | 'battery'
  | 'display'
  | 'camera'
  | 'sensors';

export type HubEntry = {
  key: HubKey;
  title: string;
  /** Primary live value; "—" when the reading is unavailable. */
  value: string;
  caption: string | null;
};
