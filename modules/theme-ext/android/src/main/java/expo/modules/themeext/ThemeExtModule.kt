package expo.modules.themeext

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

/**
 * Reads Android 12's dynamic-colour tonal palette.
 *
 * Device Matrix does not use Material You components, so this module only
 * exposes the public system accent tones. The JS theme picks the dark or
 * light tone and falls back to the app's Cyan accent when the platform has no
 * palette (Android 11 and older, or an OEM build without dynamic colours).
 */
class ThemeExtModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ThemeExt")

    Function("getSystemAccentPalette") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        null
      } else {
        val accentDark = color(
          android.R.color.system_accent1_200,
          android.R.color.system_accent1_300,
        )
        val accentLight = color(
          android.R.color.system_accent1_600,
          android.R.color.system_accent1_700,
        )
        val secondaryDark = color(
          android.R.color.system_accent3_200,
          android.R.color.system_accent3_300,
        )
        val secondaryLight = color(
          android.R.color.system_accent3_600,
          android.R.color.system_accent3_700,
        )

        if (accentDark == null || accentLight == null || secondaryDark == null || secondaryLight == null) {
          null
        } else {
          mapOf(
            "accentDark" to accentDark,
            "accentLight" to accentLight,
            "secondaryDark" to secondaryDark,
            "secondaryLight" to secondaryLight,
          )
        }
      }
    }
  }

  /** First readable resource id as `#RRGGBB`, or null when the OEM omitted it. */
  private fun color(vararg ids: Int): String? {
    val resources = appContext.reactContext?.resources ?: return null
    for (id in ids) {
      try {
        val value = resources.getColor(id, null)
        return String.format(Locale.ROOT, "#%06X", 0xFFFFFF and value)
      } catch (_: Exception) {
        // Try the next public tone.
      }
    }
    return null
  }
}
