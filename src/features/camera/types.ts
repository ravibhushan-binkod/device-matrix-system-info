export type CameraSpec = {
  key: string;
  label: string;
  value: string | null;
};

export type CameraEntry = {
  key: string;
  /** e.g. "Back camera" or "Back camera 2" when a facing has several. */
  title: string;
  /** Short chips: megapixels, aperture, focal length. */
  chips: string[];
  specs: CameraSpec[];
};
