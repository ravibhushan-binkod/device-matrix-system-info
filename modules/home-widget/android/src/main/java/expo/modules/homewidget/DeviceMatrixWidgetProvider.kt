package expo.modules.homewidget

/**
 * Legacy class name retained so a RAM widget placed from the previous build is
 * adopted as the RAM Compact widget instead of being orphaned on upgrade.
 */
class DeviceMatrixWidgetProvider : BaseWidgetProvider() {
  override val type = WidgetType.RAM_COMPACT
}
