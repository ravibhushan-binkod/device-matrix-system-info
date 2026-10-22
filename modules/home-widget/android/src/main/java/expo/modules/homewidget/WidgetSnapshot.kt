package expo.modules.homewidget

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Environment
import android.os.StatFs
import kotlin.math.roundToInt

internal data class UsageMetric(
  val usedBytes: Long,
  val totalBytes: Long
) {
  val percent: Int
    get() = if (totalBytes > 0L) {
      ((usedBytes.toDouble() / totalBytes.toDouble()) * 100.0).roundToInt().coerceIn(0, 100)
    } else {
      0
    }
}

internal enum class BatteryState {
  CHARGING,
  ON_BATTERY,
  FULL,
  NOT_CHARGING,
  UNKNOWN
}

internal data class BatteryMetric(
  val percent: Int?,
  val state: BatteryState
)

/**
 * A point-in-time snapshot for the widget. Android does not expose CPU/device
 * temperature reliably to ordinary apps, so the widget only shows the public
 * battery level/status (and no temperature).
 */
internal data class WidgetSnapshot(
  val memory: UsageMetric?,
  val storage: UsageMetric?,
  val battery: BatteryMetric
) {
  companion object {
    fun read(context: Context): WidgetSnapshot {
      return WidgetSnapshot(
        memory = readMemory(context),
        storage = readStorage(),
        battery = readBattery(context)
      )
    }

    private fun readMemory(context: Context): UsageMetric? {
      return try {
        val activityManager =
          context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return null
        val info = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(info)
        if (info.totalMem <= 0L) {
          null
        } else {
          val usedBytes = (info.totalMem - info.availMem).coerceIn(0L, info.totalMem)
          UsageMetric(usedBytes = usedBytes, totalBytes = info.totalMem)
        }
      } catch (_: Exception) {
        null
      }
    }

    private fun readStorage(): UsageMetric? {
      return try {
        val stat = StatFs(Environment.getDataDirectory().absolutePath)
        val totalBytes = stat.totalBytes
        if (totalBytes <= 0L) {
          null
        } else {
          val availableBytes = stat.availableBytes.coerceIn(0L, totalBytes)
          UsageMetric(usedBytes = totalBytes - availableBytes, totalBytes = totalBytes)
        }
      } catch (_: Exception) {
        null
      }
    }

    private fun readBattery(context: Context): BatteryMetric {
      return try {
        val intent = context.registerReceiver(
          null,
          IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        ) ?: return BatteryMetric(percent = null, state = BatteryState.UNKNOWN)

        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val percent = if (level >= 0 && scale > 0) {
          ((level.toDouble() / scale.toDouble()) * 100.0).roundToInt().coerceIn(0, 100)
        } else {
          null
        }

        BatteryMetric(
          percent = percent,
          state = when (intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
            BatteryManager.BATTERY_STATUS_CHARGING -> BatteryState.CHARGING
            BatteryManager.BATTERY_STATUS_DISCHARGING -> BatteryState.ON_BATTERY
            BatteryManager.BATTERY_STATUS_FULL -> BatteryState.FULL
            BatteryManager.BATTERY_STATUS_NOT_CHARGING -> BatteryState.NOT_CHARGING
            else -> BatteryState.UNKNOWN
          }
        )
      } catch (_: Exception) {
        BatteryMetric(percent = null, state = BatteryState.UNKNOWN)
      }
    }
  }
}
