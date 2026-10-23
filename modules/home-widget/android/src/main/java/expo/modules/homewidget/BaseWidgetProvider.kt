package expo.modules.homewidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

/**
 * Shared widget lifecycle. All readings are cheap local snapshots, so a
 * provider update and a manual refresh run synchronously in the receiver.
 * A refresh action updates every placed Device Matrix widget, preserving each
 * instance's per-ID appearance.
 */
abstract class BaseWidgetProvider : AppWidgetProvider() {
  abstract val type: WidgetType

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    if (appWidgetIds.isEmpty()) return
    WidgetUpdater.updateIds(context, appWidgetManager, type, appWidgetIds)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle,
  ) {
    super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    WidgetUpdater.updateIds(context, appWidgetManager, type, intArrayOf(appWidgetId))
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_REFRESH && WidgetPrefs.tryAcquireRefreshAll(context)) {
      WidgetUpdater.refreshAll(context)
    }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    WidgetPrefs.clear(context, appWidgetIds)
  }

  companion object {
    const val ACTION_REFRESH = "expo.modules.homewidget.action.REFRESH_ALL"
    const val EXTRA_APPWIDGET_ID = "expo.modules.homewidget.extra.APPWIDGET_ID"
  }
}

internal object WidgetUpdater {
  fun updateIds(
    context: Context,
    manager: AppWidgetManager,
    type: WidgetType,
    widgetIds: IntArray,
  ) {
    if (widgetIds.isEmpty()) return
    val data = WidgetData.read(context)
    for (widgetId in widgetIds) {
      WidgetRenderer.render(context, manager, widgetId, type, data)
    }
  }

  fun updateOne(context: Context, type: WidgetType, widgetId: Int) {
    val manager = AppWidgetManager.getInstance(context)
    updateIds(context, manager, type, intArrayOf(widgetId))
  }

  /**
   * The manual refresh action's contract: find every placed widget of every
   * supported option, read one local snapshot, and re-render each instance.
   * Appearance is read from storage per widget ID by the renderer.
   */
  fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val data = WidgetData.read(context)
    for (type in WidgetType.values()) {
      val ids = manager.getAppWidgetIds(
        android.content.ComponentName(context, type.providerClass),
      )
      for (widgetId in ids) {
        WidgetRenderer.render(context, manager, widgetId, type, data)
      }
    }
  }
}
