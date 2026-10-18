export type SensorRow = {
  key: string;
  /** `Sensor.TYPE_*` constant, for the detail route. */
  type: number;
  /** Friendly type name, e.g. "Accelerometer". */
  label: string;
  name: string;
  vendor: string;
  wakeUp: boolean;
  /** Lowercase haystack for the search box. */
  searchText: string;
};

export type SensorValue = {
  key: string;
  label: string;
  value: string;
};
