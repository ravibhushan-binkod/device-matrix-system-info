package expo.modules.homewidget

import android.appwidget.AppWidgetProvider

enum class WidgetMetric {
  RAM,
  STORAGE,
  BATTERY,
  HEALTH,
}

enum class WidgetTier {
  COMPACT,
  STANDARD,
  DETAILED,
  HERO,
}

/**
 * The ten widget options exposed by the launcher picker. Keeping the provider
 * class in the definition makes configuration and "refresh all" unambiguous:
 * every option has exactly one receiver, including the two legacy provider
 * class names that are reused so placed RAM/Battery widgets migrate in place.
 */
enum class WidgetType(
  val metric: WidgetMetric,
  val tier: WidgetTier,
  val providerClass: Class<out AppWidgetProvider>,
  val layoutRes: Int,
  val labelRes: Int,
  val descriptionRes: Int,
  val titleRes: Int,
  val route: String,
  val previewHeightDp: Int,
) {
  RAM_COMPACT(
    WidgetMetric.RAM,
    WidgetTier.COMPACT,
    DeviceMatrixWidgetProvider::class.java,
    R.layout.widget_ram_compact,
    R.string.widget_ram_compact,
    R.string.widget_ram_compact_description,
    R.string.widget_ram,
    "memory",
    68,
  ),
  STORAGE_COMPACT(
    WidgetMetric.STORAGE,
    WidgetTier.COMPACT,
    StorageCompactWidgetProvider::class.java,
    R.layout.widget_storage_compact,
    R.string.widget_storage_compact,
    R.string.widget_storage_compact_description,
    R.string.widget_storage,
    "storage",
    68,
  ),
  BATTERY_COMPACT(
    WidgetMetric.BATTERY,
    WidgetTier.COMPACT,
    BatteryWidgetProvider::class.java,
    R.layout.widget_battery_compact,
    R.string.widget_battery_compact,
    R.string.widget_battery_compact_description,
    R.string.widget_battery,
    "battery",
    68,
  ),
  RAM_STANDARD(
    WidgetMetric.RAM,
    WidgetTier.STANDARD,
    RamStandardWidgetProvider::class.java,
    R.layout.widget_ram_standard,
    R.string.widget_ram_standard,
    R.string.widget_ram_standard_description,
    R.string.widget_ram,
    "memory",
    188,
  ),
  STORAGE_STANDARD(
    WidgetMetric.STORAGE,
    WidgetTier.STANDARD,
    StorageStandardWidgetProvider::class.java,
    R.layout.widget_storage_standard,
    R.string.widget_storage_standard,
    R.string.widget_storage_standard_description,
    R.string.widget_storage,
    "storage",
    188,
  ),
  BATTERY_STANDARD(
    WidgetMetric.BATTERY,
    WidgetTier.STANDARD,
    BatteryStandardWidgetProvider::class.java,
    R.layout.widget_battery_standard,
    R.string.widget_battery_standard,
    R.string.widget_battery_standard_description,
    R.string.widget_battery,
    "battery",
    188,
  ),
  RAM_DETAILED(
    WidgetMetric.RAM,
    WidgetTier.DETAILED,
    RamDetailedWidgetProvider::class.java,
    R.layout.widget_ram_detailed,
    R.string.widget_ram_detailed,
    R.string.widget_ram_detailed_description,
    R.string.widget_ram,
    "memory",
    88,
  ),
  STORAGE_DETAILED(
    WidgetMetric.STORAGE,
    WidgetTier.DETAILED,
    StorageDetailedWidgetProvider::class.java,
    R.layout.widget_storage_detailed,
    R.string.widget_storage_detailed,
    R.string.widget_storage_detailed_description,
    R.string.widget_storage,
    "storage",
    88,
  ),
  BATTERY_DETAILED(
    WidgetMetric.BATTERY,
    WidgetTier.DETAILED,
    BatteryDetailedWidgetProvider::class.java,
    R.layout.widget_battery_detailed,
    R.string.widget_battery_detailed,
    R.string.widget_battery_detailed_description,
    R.string.widget_battery,
    "battery",
    88,
  ),
  HEALTH_HERO(
    WidgetMetric.HEALTH,
    WidgetTier.HERO,
    DeviceHealthWidgetProvider::class.java,
    R.layout.widget_health_hero,
    R.string.widget_health_hero,
    R.string.widget_health_hero_description,
    R.string.widget_health_title,
    "",
    208,
  );

  companion object {
    fun fromProvider(className: String?): WidgetType? =
      values().firstOrNull { it.providerClass.name == className }
  }
}
