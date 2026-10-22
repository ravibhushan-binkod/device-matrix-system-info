package expo.modules.homewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.text.format.DateFormat
import android.text.format.Formatter
import android.util.Log
import android.util.TypedValue
import android.widget.RemoteViews
import java.util.Date

class DeviceMatrixWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (widgetId in appWidgetIds) {
      updateWidget(context, appWidgetManager, widgetId)
    }
  }

  override fun onEnabled(context: Context) {
    updateAll(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_REFRESH) {
      updateAll(context)
    }
  }

  private fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(
      ComponentName(context, DeviceMatrixWidgetProvider::class.java)
    )
    for (widgetId in ids) {
      updateWidget(context, manager, widgetId)
    }
  }

  private fun updateWidget(
    context: Context,
    manager: AppWidgetManager,
    widgetId: Int
  ) {
    try {
      val snapshot = WidgetSnapshot.read(context)
      val views = RemoteViews(context.packageName, R.layout.widget_device_matrix)
      val updated = DateFormat.getTimeFormat(context).format(Date())

      views.setTextViewText(
        R.id.widget_updated,
        context.getString(R.string.widget_updated, updated)
      )

      bindUsage(
        context = context,
        views = views,
        valueId = R.id.widget_memory_value,
        detailId = R.id.widget_memory_detail,
        metric = snapshot.memory
      )
      bindUsage(
        context = context,
        views = views,
        valueId = R.id.widget_storage_value,
        detailId = R.id.widget_storage_detail,
        metric = snapshot.storage
      )
      bindBattery(context, views, snapshot.battery)

      views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent(context))
      views.setOnClickPendingIntent(R.id.widget_title, appPendingIntent(context))
      views.setOnClickPendingIntent(
        R.id.widget_memory_tile,
        deepLinkPendingIntent(context, "memory", REQUEST_MEMORY)
      )
      views.setOnClickPendingIntent(
        R.id.widget_storage_tile,
        deepLinkPendingIntent(context, "storage", REQUEST_STORAGE)
      )
      views.setOnClickPendingIntent(
        R.id.widget_battery_tile,
        deepLinkPendingIntent(context, "battery", REQUEST_BATTERY)
      )

      manager.updateAppWidget(widgetId, views)
    } catch (error: Exception) {
      Log.w(TAG, "Could not update widget $widgetId", error)
    }
  }

  private fun bindUsage(
    context: Context,
    views: RemoteViews,
    valueId: Int,
    detailId: Int,
    metric: UsageMetric?
  ) {
    if (metric == null) {
      views.setTextViewText(valueId, context.getString(R.string.widget_not_available))
      views.setTextViewTextSize(valueId, TypedValue.COMPLEX_UNIT_SP, 10f)
      views.setTextViewText(detailId, context.getString(R.string.widget_on_this_device))
      return
    }

    views.setTextViewText(valueId, "${metric.percent}%")
    views.setTextViewTextSize(valueId, TypedValue.COMPLEX_UNIT_SP, 17f)
    val used = Formatter.formatShortFileSize(context, metric.usedBytes)
    val total = Formatter.formatShortFileSize(context, metric.totalBytes)
    views.setTextViewText(detailId, "$used / $total")
  }

  private fun bindBattery(
    context: Context,
    views: RemoteViews,
    battery: BatteryMetric
  ) {
    val percent = battery.percent
    if (percent == null) {
      views.setTextViewText(
        R.id.widget_battery_value,
        context.getString(R.string.widget_not_available)
      )
      views.setTextViewTextSize(R.id.widget_battery_value, TypedValue.COMPLEX_UNIT_SP, 11f)
      views.setTextViewText(
        R.id.widget_battery_detail,
        context.getString(R.string.widget_on_this_device)
      )
      return
    }

    views.setTextViewText(R.id.widget_battery_value, "$percent%")
    views.setTextViewTextSize(R.id.widget_battery_value, TypedValue.COMPLEX_UNIT_SP, 17f)
    views.setTextViewText(R.id.widget_battery_detail, batteryStateLabel(context, battery.state))
  }

  private fun batteryStateLabel(context: Context, state: BatteryState): String {
    return context.getString(
      when (state) {
        BatteryState.CHARGING -> R.string.widget_charging
        BatteryState.ON_BATTERY -> R.string.widget_on_battery
        BatteryState.FULL -> R.string.widget_full
        BatteryState.NOT_CHARGING -> R.string.widget_not_charging
        BatteryState.UNKNOWN -> R.string.widget_status_unknown
      }
    )
  }

  private fun refreshPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, DeviceMatrixWidgetProvider::class.java).apply {
      action = ACTION_REFRESH
    }
    return PendingIntent.getBroadcast(
      context,
      REQUEST_REFRESH,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun appPendingIntent(context: Context): PendingIntent {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_VIEW, Uri.parse("devicematrix://")).apply {
        setPackage(context.packageName)
      }
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(
      context,
      REQUEST_APP,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun deepLinkPendingIntent(
    context: Context,
    route: String,
    requestCode: Int
  ): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("devicematrix://$route")).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    if (intent.resolveActivity(context.packageManager) == null) {
      return appPendingIntent(context)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  companion object {
    const val ACTION_REFRESH = "com.binkod.devicematrix.widget.REFRESH"
    private const val TAG = "DeviceMatrixWidget"
    private const val REQUEST_REFRESH = 1000
    private const val REQUEST_MEMORY = 1001
    private const val REQUEST_STORAGE = 1002
    private const val REQUEST_BATTERY = 1003
    private const val REQUEST_APP = 1004
  }
}
