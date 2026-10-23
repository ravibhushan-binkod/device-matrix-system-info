package expo.modules.homewidget

/**
 * Legacy class name retained so a battery widget placed from the previous
 * build is adopted as the Battery Compact widget instead of being orphaned.
 */
class BatteryWidgetProvider : BaseWidgetProvider() {
  override val type = WidgetType.BATTERY_COMPACT
}
