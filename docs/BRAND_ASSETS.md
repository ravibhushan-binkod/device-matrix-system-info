# Brand assets

Device Matrix shows a small brand mark next to the device maker, the OS, the
SoC maker/family and the GPU family. This file records exactly which marks are
used, where they came from, their licence, and the date they were checked.

> DRAFT - needs legal review. This document is an engineering record, not a
> legal opinion.

## Source and licence

- Source: [Simple Icons](https://simpleicons.org), fetched from
  `https://cdn.simpleicons.org/<slug>` on **2026-10-21**.
- Licence: Simple Icons is released under **CC0 1.0 Universal** (public domain
  dedication). The project's `LICENSE.md` states CC0 1.0 for the icon set;
  brand names and logos remain the property of their owners.
- Only the raw `<path d="…">` data is copied into
  `src/core/brand/brand-logos.ts` (one file, ~25 KB, well under the 60 KB
  budget). No bitmaps, no SVG files, no runtime network calls; marks are drawn
  in a single theme colour on a 24x24 viewBox with `react-native-svg`.
- Regeneration: re-run the fetch step documented in the file header of
  `brand-logos.ts`, then update the check date here. Path data is never edited
  by hand.

## Marks that ship (with logo)

| Slug        | Brand     | Used for                                                           |
| ----------- | --------- | ------------------------------------------------------------------ |
| `android`   | Android   | Device/OS header when the build is plain Android                   |
| `harmonyos` | HarmonyOS | Device/OS header when the build reports HarmonyOS                  |
| `samsung`   | Samsung   | Phone maker                                                        |
| `google`    | Google    | Phone maker (Pixel)                                                |
| `xiaomi`    | Xiaomi    | Phone maker (Xiaomi, Redmi, Poco)                                  |
| `oneplus`   | OnePlus   | Phone maker                                                        |
| `oppo`      | OPPO      | Phone maker                                                        |
| `vivo`      | Vivo      | Phone maker (Vivo, iQOO)                                           |
| `honor`     | HONOR     | Phone maker                                                        |
| `huawei`    | Huawei    | Phone maker                                                        |
| `motorola`  | Motorola  | Phone maker                                                        |
| `nokia`     | Nokia     | Phone maker                                                        |
| `sony`      | Sony      | Phone maker                                                        |
| `asus`      | ASUS      | Phone maker                                                        |
| `lg`        | LG        | Phone maker                                                        |
| `lenovo`    | Lenovo    | Phone maker                                                        |
| `fairphone` | Fairphone | Phone maker                                                        |
| `sharp`     | Sharp     | Phone maker                                                        |
| `meizu`     | Meizu     | Phone maker                                                        |
| `qualcomm`  | Qualcomm  | SoC maker (Qualcomm / Snapdragon / `SM8xxx`, `MSM`, `SDM`, `qcom`) |
| `mediatek`  | MediaTek  | SoC maker (MediaTek / Dimensity / Helio / `MTxxxx`)                |
| `arm`       | Arm       | GPU family Mali / Immortalis                                       |

`snapdragon` is also stored for completeness (Qualcomm's mobile platform
brand); the SoC header uses `qualcomm` as the maker mark.

## Brands that intentionally use the neutral initials badge

No licensed logo is available for these in the asset set, so the UI draws the
app's own neutral badge with up to two letters. No logo is invented, traced or
approximated, and no website is scraped.

| Family / maker                                                                                 | Badge                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------ |
| Nothing, realme, TCL, ZTE, Nubia, Black Shark, Essential, Tecno, Infinix, Itel, Lava, Micromax | initials of the reported brand |
| Exynos (Samsung SoC family)                                                                    | `EX`                           |
| Tensor (Google SoC family)                                                                     | `TE`                           |
| Kirin / HiSilicon                                                                              | `KI`                           |
| Unisoc / Spreadtrum                                                                            | `UN`                           |
| Adreno                                                                                         | `AD`                           |
| PowerVR / Imagination                                                                          | `PO`                           |
| Xclipse                                                                                        | `XC`                           |

## Trademark note

All brand names and marks are trademarks or registered trademarks of their
respective owners. Device Matrix uses them only to identify the hardware and
software that reported the reading, with no endorsement or affiliation implied.
The same sentence appears on the About screen.

If a device reports a maker or family that is not in the tables above, the app
shows a neutral initials badge derived from the reported string, or nothing
when Android reported no value at all.
