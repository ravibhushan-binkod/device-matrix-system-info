package expo.modules.homewidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tiny bridge for the Home widget: the app only mirrors the two unit choices
 * the widget will need later (temperature, storage) into the same
 * SharedPreferences the widget reads. The widget itself is native-only; this
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
  }

  private companion object {
    const val PREFS_NAME = "device_matrix_widget"
    const val KEY_TEMPERATURE_UNIT = "temperatureUnit"
    const val KEY_STORAGE_UNIT = "storageUnit"
  }
}
