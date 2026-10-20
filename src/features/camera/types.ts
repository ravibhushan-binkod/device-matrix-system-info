export type CameraSpec = {
  key: string;
  label: string;
  value: string | null;
  /** Long list values render as a label above a wrapping value. */
  multiline?: boolean;
};

export type CameraEntry = {
  key: string;
  /** e.g. "Back camera" or "Back camera 2" when a facing has several. */
  title: string;
  /** Short chips: megapixels, aperture, focal length. */
  chips: string[];
  specs: CameraSpec[];
};
