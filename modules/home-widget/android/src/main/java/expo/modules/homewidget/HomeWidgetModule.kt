package expo.modules.homewidget

import android.content.Context
import android.graphics.Color
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tiny bridge for the home-screen widgets: the app mirrors its resolved unit
 * choices into the same SharedPreferences the widgets read. The RAM widget
 * uses the storage unit to format its sizes; the temperature key is retained
 * for stored-preference compatibility. The widgets are native-only; this
 * module never returns readings.
 */
class HomeWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HomeWidget")

    Function("setUnitPreferences") { temperature: String, storage: String ->
      val context = appContext.reactContext ?: return@Function
      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_TEMPERATURE_UNIT, temperature)
        .putString(KEY_STORAGE_UNIT, storage)
        .apply()
    }

    Function("getAppearance") {
      val context = appContext.reactContext
        ?: return@Function mapOf<String, Any?>(
          "theme" to "system",
          "accent" to "cyan",
          "matchApp" to true,
          "accentLight" to null,
          "accentDark" to null,
        )
      WidgetPrefs.themeAndAccent(context)
    }

    Function("setAppearance") { theme: String, accent: String, accentLight: String?, accentDark: String? ->
      val context = appContext.reactContext ?: return@Function 0
      WidgetPrefs.saveThemeAndAccent(
        context,
        WidgetTheme.fromKey(theme),
        WidgetAccent.fromKey(accent),
        parseColor(accentLight),
        parseColor(accentDark),
      )
      WidgetType.values().sumOf { type ->
        val manager = android.appwidget.AppWidgetManager.getInstance(context)
        manager.getAppWidgetIds(
          android.content.ComponentName(context, type.providerClass),
        ).size
      }
    }
  }

  private fun parseColor(value: String?): Int? {
    if (value == null) return null
    return try {
      Color.parseColor(value)
    } catch (_: IllegalArgumentException) {
      null
    }
  }

  private companion object {
    const val PREFS_NAME = "device_matrix_widget"
    const val KEY_TEMPERATURE_UNIT = "temperatureUnit"
    const val KEY_STORAGE_UNIT = "storageUnit"
  }
}
