package expo.modules.homewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.AdaptiveIconDrawable
import android.net.Uri
import android.os.Build
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import kotlin.math.max
import kotlin.math.roundToInt

internal object WidgetRenderer {
  private const val TAG = "DeviceMatrixWidget"

  fun render(
    context: Context,
    manager: AppWidgetManager,
    widgetId: Int,
    type: WidgetType,
    data: WidgetData = WidgetData.read(context),
  ) {
    try {
      val appearance = WidgetPrefs.appearance(context, widgetId)
      val views = build(
        context = context,
        type = type,
        widgetId = widgetId,
        appearance = appearance,
        data = data,
        interactive = true,
      )
      manager.updateAppWidget(widgetId, views)
    } catch (error: Exception) {
      Log.w(TAG, "Could not update ${type.name} widget $widgetId", error)
    }
  }

  fun preview(
    context: Context,
    type: WidgetType,
    appearance: WidgetAppearance,
    data: WidgetData = WidgetData.read(context),
  ): RemoteViews = build(
    context = context,
    type = type,
    widgetId = -1,
    appearance = appearance,
    data = data,
    interactive = false,
  )

  private fun build(
    context: Context,
    type: WidgetType,
    widgetId: Int,
    appearance: WidgetAppearance,
    data: WidgetData,
    interactive: Boolean,
  ): RemoteViews {
    val colors = resolveWidgetColors(context, appearance)
    val views = RemoteViews(context.packageName, type.layoutRes)

    views.setImageViewResource(R.id.widget_bg, colors.background)
    views.setImageViewBitmap(R.id.widget_icon, appIconBitmap(context, colors.iconBorder))
    views.setImageViewResource(R.id.widget_refresh, colors.refreshIcon)
    views.setTextViewText(R.id.widget_title, context.getString(type.titleRes))
    views.setTextColor(R.id.widget_title, colors.text)
    bindMotion(context, views, appearance, colors, widgetId, advance = interactive)
    if (type.tier == WidgetTier.HERO) {
      views.setTextColor(R.id.widget_clock, colors.text)
    }

    val rootDescription = when (type.tier) {
      WidgetTier.COMPACT -> bindCompact(context, views, colors, type, data)
      WidgetTier.STANDARD -> bindStandard(context, views, colors, type, data)
      WidgetTier.DETAILED -> bindDetailed(context, views, colors, type, data)
      WidgetTier.HERO -> bindHealth(context, views, colors, data)
    }

    views.setContentDescription(R.id.widget_root, rootDescription)
    views.setContentDescription(R.id.widget_icon, context.getString(R.string.widget_logo))
    views.setContentDescription(R.id.widget_refresh, context.getString(R.string.widget_refresh_all))

    if (interactive) {
      views.setOnClickPendingIntent(
        R.id.widget_root,
        appPendingIntent(context, widgetId, type),
      )
      views.setOnClickPendingIntent(
        R.id.widget_refresh,
        refreshPendingIntent(context, widgetId, type),
      )
    }

    return views
  }

  private fun bindMotion(
    context: Context,
    views: RemoteViews,
    appearance: WidgetAppearance,
    colors: WidgetColors,
    widgetId: Int,
    advance: Boolean,
  ) {
    views.setImageViewResource(R.id.widget_sheen_a, colors.sheenSoft)
    views.setImageViewResource(R.id.widget_sheen_b, colors.sheenBright)
    val child = if (advance && appearance.motion && widgetId >= 0) {
      WidgetPrefs.nextMotionPhase(context, widgetId)
    } else {
      0
    }
    views.setInt(R.id.widget_motion, "setDisplayedChild", child)
  }

  private fun bindCompact(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    type: WidgetType,
    data: WidgetData,
  ): String {
    views.setTextColor(R.id.widget_value, colors.text)
    views.setTextColor(R.id.widget_percent, colors.accent)
    views.setTextColor(R.id.widget_caption, colors.muted)
    views.setViewVisibility(R.id.widget_caption, View.GONE)
    views.setViewVisibility(R.id.widget_bar, View.VISIBLE)

    return when (type.metric) {
      WidgetMetric.RAM -> {
        val ram = data.ram
        if (ram == null) {
          setUnavailableCompact(context, views)
          context.getString(R.string.widget_a11y_ram_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          views.setTextViewText(
            R.id.widget_value,
            formatWidgetBytesPair(ram.usedBytes, ram.totalBytes, binary),
          )
          views.setTextViewText(R.id.widget_percent, "${ram.percent}%")
          views.setViewVisibility(R.id.widget_percent, View.VISIBLE)
          views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 13f)
          setBar(
            views,
            colors,
            ram.percent,
            context.getString(R.string.widget_bar_ram, ram.percent),
          )
          context.getString(
            R.string.widget_a11y_ram,
            formatWidgetBytes(ram.usedBytes, binary, 1),
            formatWidgetBytes(ram.totalBytes, binary, 1),
            ram.percent,
          )
        }
      }

      WidgetMetric.STORAGE -> {
        val storage = data.storage
        if (storage == null) {
          setUnavailableCompact(context, views)
          context.getString(R.string.widget_a11y_storage_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          views.setTextViewText(
            R.id.widget_value,
            formatWidgetBytesPair(storage.usedBytes, storage.totalBytes, binary),
          )
          views.setTextViewText(R.id.widget_percent, "${storage.percent}%")
          views.setViewVisibility(R.id.widget_percent, View.VISIBLE)
          views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 13f)
          setBar(
            views,
            colors,
            storage.percent,
            context.getString(R.string.widget_bar_storage, storage.percent),
          )
          context.getString(
            R.string.widget_a11y_storage,
            formatWidgetBytes(storage.usedBytes, binary, 1),
            formatWidgetBytes(storage.totalBytes, binary, 1),
            storage.percent,
          )
        }
      }

      WidgetMetric.BATTERY -> {
        val battery = data.battery
        val percent = battery.percent
        if (percent == null) {
          setUnavailableCompact(context, views)
          context.getString(R.string.widget_a11y_battery_unavailable)
        } else {
          val status = context.getString(battery.status.labelRes)
          views.setTextViewText(R.id.widget_percent, "$percent%")
          views.setViewVisibility(R.id.widget_percent, View.VISIBLE)
          views.setTextViewText(R.id.widget_value, status)
          views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 13f)
          setBar(
            views,
            colors,
            percent,
            context.getString(R.string.widget_bar_battery, percent),
          )
          context.getString(R.string.widget_a11y_battery, percent, status)
        }
      }

      WidgetMetric.HEALTH -> ""
    }
  }

  private fun bindStandard(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    type: WidgetType,
    data: WidgetData,
  ): String {
    views.setTextColor(R.id.widget_ring_value, colors.text)
    views.setTextColor(R.id.widget_ring_label, colors.muted)
    views.setTextColor(R.id.widget_caption, colors.muted)
    views.setTextViewTextSize(R.id.widget_ring_value, TypedValue.COMPLEX_UNIT_SP, 30f)

    return when (type.metric) {
      WidgetMetric.RAM -> {
        val ram = data.ram
        if (ram == null) {
          setUnavailableStandard(context, views, colors, R.string.widget_ring_used)
          context.getString(R.string.widget_a11y_ram_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          setRing(views, colors, ram.percent, context.getString(R.string.widget_bar_ram, ram.percent))
          views.setTextViewText(R.id.widget_ring_value, "${ram.percent}%")
          views.setTextViewText(R.id.widget_ring_label, context.getString(R.string.widget_ring_used))
          views.setTextViewText(
            R.id.widget_caption,
            formatWidgetBytesPair(ram.usedBytes, ram.totalBytes, binary),
          )
          context.getString(
            R.string.widget_a11y_ram,
            formatWidgetBytes(ram.usedBytes, binary, 1),
            formatWidgetBytes(ram.totalBytes, binary, 1),
            ram.percent,
          )
        }
      }

      WidgetMetric.STORAGE -> {
        val storage = data.storage
        if (storage == null) {
          setUnavailableStandard(context, views, colors, R.string.widget_ring_used)
          context.getString(R.string.widget_a11y_storage_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          setRing(views, colors, storage.percent, context.getString(R.string.widget_bar_storage, storage.percent))
          views.setTextViewText(R.id.widget_ring_value, "${storage.percent}%")
          views.setTextViewText(R.id.widget_ring_label, context.getString(R.string.widget_ring_used))
          views.setTextViewText(
            R.id.widget_caption,
            formatWidgetBytesPair(storage.usedBytes, storage.totalBytes, binary),
          )
          context.getString(
            R.string.widget_a11y_storage,
            formatWidgetBytes(storage.usedBytes, binary, 1),
            formatWidgetBytes(storage.totalBytes, binary, 1),
            storage.percent,
          )
        }
      }

      WidgetMetric.BATTERY -> {
        val battery = data.battery
        val percent = battery.percent
        if (percent == null) {
          setUnavailableStandard(context, views, colors, R.string.widget_ring_battery)
          context.getString(R.string.widget_a11y_battery_unavailable)
        } else {
          setRing(views, colors, percent, context.getString(R.string.widget_bar_battery, percent))
          views.setTextViewText(R.id.widget_ring_value, "$percent%")
          views.setTextViewText(R.id.widget_ring_label, context.getString(R.string.widget_ring_battery))
          val status = context.getString(battery.status.labelRes)
          views.setTextViewText(R.id.widget_caption, status)
          context.getString(R.string.widget_a11y_battery, percent, status)
        }
      }

      WidgetMetric.HEALTH -> ""
    }
  }

  private fun bindDetailed(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    type: WidgetType,
    data: WidgetData,
  ): String {
    views.setTextColor(R.id.widget_value, colors.text)
    views.setTextColor(R.id.widget_percent, colors.accent)
    views.setTextColor(R.id.widget_caption, colors.muted)
    views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 20f)
    views.setViewVisibility(R.id.widget_caption, View.VISIBLE)
    views.setViewVisibility(R.id.widget_bar, View.VISIBLE)

    return when (type.metric) {
      WidgetMetric.RAM -> {
        val ram = data.ram
        if (ram == null) {
          setUnavailableDetailed(context, views)
          context.getString(R.string.widget_a11y_ram_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          views.setTextViewText(
            R.id.widget_value,
            formatWidgetBytes(ram.usedBytes, binary, decimals = 1),
          )
          views.setTextViewText(R.id.widget_percent, "${ram.percent}%")
          views.setViewVisibility(R.id.widget_percent, View.VISIBLE)
          views.setTextViewText(
            R.id.widget_caption,
            context.getString(
              R.string.widget_detailed_usage,
              formatWidgetBytes(ram.totalBytes, binary, 1),
              formatWidgetBytes(ram.availableBytes, binary, 1),
            ),
          )
          setBar(views, colors, ram.percent, context.getString(R.string.widget_bar_ram, ram.percent))
          context.getString(
            R.string.widget_a11y_ram_detailed,
            formatWidgetBytes(ram.usedBytes, binary, 1),
            formatWidgetBytes(ram.totalBytes, binary, 1),
            formatWidgetBytes(ram.availableBytes, binary, 1),
            ram.percent,
          )
        }
      }

      WidgetMetric.STORAGE -> {
        val storage = data.storage
        if (storage == null) {
          setUnavailableDetailed(context, views)
          context.getString(R.string.widget_a11y_storage_unavailable)
        } else {
          val binary = WidgetPrefs.storageIsBinary(context)
          views.setTextViewText(
            R.id.widget_value,
            formatWidgetBytes(storage.usedBytes, binary, decimals = 1),
          )
          views.setTextViewText(R.id.widget_percent, "${storage.percent}%")
          views.setViewVisibility(R.id.widget_percent, View.VISIBLE)
          views.setTextViewText(
            R.id.widget_caption,
            context.getString(
              R.string.widget_detailed_usage,
              formatWidgetBytes(storage.totalBytes, binary, 1),
              formatWidgetBytes(storage.availableBytes, binary, 1),
            ),
          )
          setBar(
            views,
            colors,
            storage.percent,
            context.getString(R.string.widget_bar_storage, storage.percent),
          )
          context.getString(
            R.string.widget_a11y_storage_detailed,
            formatWidgetBytes(storage.usedBytes, binary, 1),
            formatWidgetBytes(storage.totalBytes, binary, 1),
            formatWidgetBytes(storage.availableBytes, binary, 1),
            storage.percent,
          )
        }
      }

      WidgetMetric.BATTERY -> {
        val battery = data.battery
        val percent = battery.percent
        if (percent == null) {
          setUnavailableDetailed(context, views)
          context.getString(R.string.widget_a11y_battery_unavailable)
        } else {
          views.setTextViewText(R.id.widget_value, "$percent%")
          views.setViewVisibility(R.id.widget_percent, View.GONE)
          val status = context.getString(battery.status.labelRes)
          views.setTextViewText(R.id.widget_caption, status)
          setBar(views, colors, percent, context.getString(R.string.widget_bar_battery, percent))
          context.getString(R.string.widget_a11y_battery, percent, status)
        }
      }

      WidgetMetric.HEALTH -> ""
    }
  }

  private fun bindHealth(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    data: WidgetData,
  ): String {
    val health = data.health
    val score = health.score
    val device = data.deviceName

    views.setTextColor(R.id.widget_device, colors.muted)
    views.setTextColor(R.id.widget_health_value, colors.text)
    views.setTextColor(R.id.widget_health_label, colors.muted)
    views.setTextColor(R.id.widget_health_caption, colors.muted)
    views.setTextColor(R.id.widget_health_note, colors.muted)
    views.setTextViewText(R.id.widget_device, device)
    views.setTextViewText(R.id.widget_health_note, context.getString(R.string.widget_calculated_locally))
    views.setViewVisibility(R.id.widget_health_note, View.VISIBLE)

    views.setTextColor(R.id.widget_ram_title, colors.muted)
    views.setTextColor(R.id.widget_storage_title, colors.muted)
    views.setTextColor(R.id.widget_battery_title, colors.muted)
    views.setTextColor(R.id.widget_ram_value, colors.text)
    views.setTextColor(R.id.widget_storage_value, colors.text)
    views.setTextColor(R.id.widget_battery_value, colors.text)
    views.setTextColor(R.id.widget_ram_caption, colors.muted)
    views.setTextColor(R.id.widget_storage_caption, colors.muted)
    views.setTextColor(R.id.widget_battery_caption, colors.muted)

    views.setTextViewText(R.id.widget_ram_title, context.getString(R.string.widget_ram))
    views.setTextViewText(R.id.widget_storage_title, context.getString(R.string.widget_storage))
    views.setTextViewText(R.id.widget_battery_title, context.getString(R.string.widget_battery))

    val healthDescription: String
    if (score == null) {
      views.setImageViewBitmap(
        R.id.widget_health_ring,
        ringBitmap(null, colors.accent, colors.track),
      )
      views.setTextViewText(R.id.widget_health_value, context.getString(R.string.widget_preview_value))
      views.setTextViewTextSize(R.id.widget_health_value, TypedValue.COMPLEX_UNIT_SP, 28f)
      views.setTextViewText(R.id.widget_health_label, context.getString(R.string.widget_ring_health))
      views.setTextViewText(R.id.widget_health_caption, context.getString(R.string.widget_not_available_on_device))
      views.setTextColor(R.id.widget_health_value, colors.muted)
      views.setViewVisibility(R.id.widget_health_note, View.GONE)
      healthDescription = context.getString(R.string.widget_a11y_health_unavailable)
    } else {
      val tint = healthColor(score, colors)
      views.setImageViewBitmap(
        R.id.widget_health_ring,
        ringBitmap(score, colors.accent, colors.track),
      )
      views.setTextViewText(R.id.widget_health_value, score.toString())
      views.setTextViewTextSize(R.id.widget_health_value, TypedValue.COMPLEX_UNIT_SP, 32f)
      views.setTextViewText(R.id.widget_health_label, context.getString(R.string.widget_ring_health))
      views.setTextViewText(
        R.id.widget_health_caption,
        context.getString(R.string.widget_checks_read, health.availableChecks, health.totalChecks),
      )
      views.setTextColor(R.id.widget_health_value, tint)
      healthDescription = context.getString(
        R.string.widget_a11y_health,
        score,
        health.availableChecks,
        health.totalChecks,
      )
    }

    val ramDescription = bindHealthRam(context, views, colors, data.ram)
    val storageDescription = bindHealthStorage(context, views, colors, data.storage)
    val batteryDescription = bindHealthBattery(context, views, colors, data.battery)

    return listOf(
      context.getString(R.string.widget_a11y_health_device, healthDescription, device),
      ramDescription,
      storageDescription,
      batteryDescription,
    ).joinToString(" ")
  }

  private fun bindHealthRam(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    reading: WidgetReading.Ram?,
  ): String {
    if (reading == null) {
      views.setTextViewText(R.id.widget_ram_value, context.getString(R.string.widget_preview_value))
      views.setTextViewText(R.id.widget_ram_caption, context.getString(R.string.widget_not_available_on_device))
      views.setViewVisibility(R.id.widget_ram_bar, View.GONE)
      return context.getString(R.string.widget_a11y_ram_unavailable)
    }
    val binary = WidgetPrefs.storageIsBinary(context)
    views.setTextViewText(R.id.widget_ram_value, "${reading.percent}%")
    views.setTextViewText(
      R.id.widget_ram_caption,
      formatWidgetBytesPair(reading.usedBytes, reading.totalBytes, binary),
    )
    setBar(
      views,
      colors,
      reading.percent,
      context.getString(R.string.widget_bar_ram, reading.percent),
      R.id.widget_ram_bar,
    )
    return context.getString(R.string.widget_a11y_ram, 
      formatWidgetBytes(reading.usedBytes, binary, 1),
      formatWidgetBytes(reading.totalBytes, binary, 1),
      reading.percent,
    )
  }

  private fun bindHealthStorage(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    reading: WidgetReading.Storage?,
  ): String {
    if (reading == null) {
      views.setTextViewText(R.id.widget_storage_value, context.getString(R.string.widget_preview_value))
      views.setTextViewText(R.id.widget_storage_caption, context.getString(R.string.widget_not_available_on_device))
      views.setViewVisibility(R.id.widget_storage_bar, View.GONE)
      return context.getString(R.string.widget_a11y_storage_unavailable)
    }
    val binary = WidgetPrefs.storageIsBinary(context)
    views.setTextViewText(R.id.widget_storage_value, "${reading.percent}%")
    views.setTextViewText(
      R.id.widget_storage_caption,
      formatWidgetBytesPair(reading.usedBytes, reading.totalBytes, binary),
    )
    setBar(
      views,
      colors,
      reading.percent,
      context.getString(R.string.widget_bar_storage, reading.percent),
      R.id.widget_storage_bar,
    )
    return context.getString(R.string.widget_a11y_storage, 
      formatWidgetBytes(reading.usedBytes, binary, 1),
      formatWidgetBytes(reading.totalBytes, binary, 1),
      reading.percent,
    )
  }

  private fun bindHealthBattery(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    reading: WidgetReading.Battery,
  ): String {
    val percent = reading.percent
    if (percent == null) {
      views.setTextViewText(R.id.widget_battery_value, context.getString(R.string.widget_preview_value))
      views.setTextViewText(R.id.widget_battery_caption, context.getString(R.string.widget_not_available_on_device))
      views.setViewVisibility(R.id.widget_battery_bar, View.GONE)
      return context.getString(R.string.widget_a11y_battery_unavailable)
    }
    val status = context.getString(reading.status.labelRes)
    views.setTextViewText(R.id.widget_battery_value, "$percent%")
    views.setTextViewText(R.id.widget_battery_caption, status)
    setBar(
      views,
      colors,
      percent,
      context.getString(R.string.widget_bar_battery, percent),
      R.id.widget_battery_bar,
    )
    return context.getString(R.string.widget_a11y_battery, percent, status)
  }

  private fun setUnavailableCompact(context: Context, views: RemoteViews) {
    views.setTextViewText(
      R.id.widget_value,
      context.getString(R.string.widget_not_available_on_device),
    )
    views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 10f)
    views.setViewVisibility(R.id.widget_percent, View.GONE)
    views.setViewVisibility(R.id.widget_caption, View.GONE)
    views.setViewVisibility(R.id.widget_bar, View.GONE)
  }

  private fun setUnavailableStandard(
    context: Context,
    views: RemoteViews,
    colors: WidgetColors,
    labelRes: Int,
  ) {
    views.setImageViewBitmap(
      R.id.widget_ring,
      ringBitmap(null, colors.accent, colors.track),
    )
    views.setTextViewText(R.id.widget_ring_value, context.getString(R.string.widget_preview_value))
    views.setTextViewTextSize(R.id.widget_ring_value, TypedValue.COMPLEX_UNIT_SP, 26f)
    views.setTextViewText(R.id.widget_ring_label, context.getString(labelRes))
    views.setTextViewText(R.id.widget_caption, context.getString(R.string.widget_not_available_on_device))
    views.setContentDescription(
      R.id.widget_ring,
      context.getString(R.string.widget_not_available_on_device),
    )
  }

  private fun setUnavailableDetailed(context: Context, views: RemoteViews) {
    views.setTextViewText(
      R.id.widget_value,
      context.getString(R.string.widget_not_available_on_device),
    )
    views.setTextViewTextSize(R.id.widget_value, TypedValue.COMPLEX_UNIT_SP, 14f)
    views.setViewVisibility(R.id.widget_percent, View.GONE)
    views.setViewVisibility(R.id.widget_caption, View.GONE)
    views.setViewVisibility(R.id.widget_bar, View.GONE)
  }

  private fun setRing(
    views: RemoteViews,
    colors: WidgetColors,
    percent: Int,
    description: String,
  ) {
    views.setImageViewBitmap(
      R.id.widget_ring,
      ringBitmap(percent, colors.accent, colors.track),
    )
    views.setContentDescription(R.id.widget_ring, description)
  }

  private fun setBar(
    views: RemoteViews,
    colors: WidgetColors,
    percent: Int,
    description: String,
    viewId: Int = R.id.widget_bar,
  ) {
    views.setImageViewBitmap(
      viewId,
      barBitmap(percent, colors.accent, colors.track),
    )
    views.setViewVisibility(viewId, View.VISIBLE)
    views.setContentDescription(viewId, description)
  }

  private fun healthColor(score: Int, colors: WidgetColors): Int = when {
    score >= 80 -> colors.good
    score >= 60 -> colors.warning
    else -> colors.critical
  }

  private fun ringBitmap(
    percent: Int?,
    accent: Int,
    track: Int,
  ): Bitmap {
    val size = 256
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val stroke = 26f
    val inset = stroke / 2f + 4f
    val rect = RectF(inset, inset, size - inset, size - inset)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      strokeCap = Paint.Cap.ROUND
    }

    paint.color = track
    canvas.drawArc(rect, 0f, 360f, false, paint)

    if (percent != null) {
      val clamped = percent.coerceIn(0, 100)
      if (clamped > 0) {
        paint.color = accent
        canvas.drawArc(rect, -90f, 360f * (clamped / 100f), false, paint)
      }
    }

    return bitmap
  }

  private fun barBitmap(percent: Int, accent: Int, track: Int): Bitmap {
    val width = 512
    val height = 16
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val radius = height / 2f

    paint.color = track
    canvas.drawRoundRect(RectF(0f, 0f, width.toFloat(), height.toFloat()), radius, radius, paint)

    val clamped = percent.coerceIn(0, 100)
    if (clamped > 0) {
      val fillWidth = (width * (clamped / 100f)).coerceAtLeast(height.toFloat())
      paint.color = accent
      canvas.drawRoundRect(RectF(0f, 0f, fillWidth, height.toFloat()), radius, radius, paint)
    }

    return bitmap
  }

  /**
   * The launcher applies the platform's adaptive-icon mask when an icon is
   * drawn normally. Drawing the adaptive layers ourselves keeps the full brand
   * artwork and gives every widget the same rounded-square application tile.
   */
  private fun appIconBitmap(context: Context, border: Int): Bitmap {
    val density = context.resources.displayMetrics.density
    val size = max((26 * density).roundToInt(), 24)
    val radius = size * 0.27f
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val bounds = RectF(0f, 0f, size.toFloat(), size.toFloat())
    val clip = Path().apply {
      addRoundRect(bounds, radius, radius, Path.Direction.CW)
    }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    canvas.save()
    canvas.clipPath(clip)
    paint.color = 0xFF0B0F14.toInt()
    canvas.drawRoundRect(bounds, radius, radius, paint)

    val drawable = context.applicationInfo.loadIcon(context.packageManager)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && drawable is AdaptiveIconDrawable) {
      drawable.background?.let {
        it.setBounds(0, 0, size, size)
        it.draw(canvas)
      }
      drawable.foreground?.let {
        it.setBounds(0, 0, size, size)
        it.draw(canvas)
      }
    } else {
      drawable.setBounds(0, 0, size, size)
      drawable.draw(canvas)
    }

    paint.shader = LinearGradient(
      0f,
      0f,
      0f,
      size * 0.55f,
      0x26FFFFFF,
      0x00FFFFFF,
      Shader.TileMode.CLAMP,
    )
    canvas.drawRoundRect(bounds, radius, radius, paint)
    paint.shader = null
    canvas.restore()

    paint.style = Paint.Style.STROKE
    paint.strokeWidth = max(1f, density * 0.8f)
    paint.color = border
    val inset = paint.strokeWidth / 2f
    canvas.drawRoundRect(
      RectF(inset, inset, size - inset, size - inset),
      radius,
      radius,
      paint,
    )
    return bitmap
  }

  private fun appPendingIntent(
    context: Context,
    widgetId: Int,
    type: WidgetType,
  ): PendingIntent {
    val intent = (if (type.route.isBlank()) {
      context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    } else {
      Intent(
        Intent.ACTION_VIEW,
        Uri.parse("devicematrix://${type.route}"),
      ).apply {
        setClassName(context.packageName, "${context.packageName}.MainActivity")
      }
    }).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    return PendingIntent.getActivity(
      context,
      widgetId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun refreshPendingIntent(
    context: Context,
    widgetId: Int,
    type: WidgetType,
  ): PendingIntent {
    val intent = Intent(context, type.providerClass).apply {
      action = BaseWidgetProvider.ACTION_REFRESH
      putExtra(BaseWidgetProvider.EXTRA_APPWIDGET_ID, widgetId)
    }
    return PendingIntent.getBroadcast(
      context,
      widgetId,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}

