package expo.modules.batteryext

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BatteryExtModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("BatteryExt")

    Events("onBatteryChanged")

    Function("getBatteryInfo") {
      readCurrent()
    }

    Function("startBatteryListener") {
      startListener()
    }

    Function("stopBatteryListener") {
      stopListener()
    }

    OnDestroy {
      stopListener()
    }
  }

  /** One-shot read of the last sticky ACTION_BATTERY_CHANGED broadcast. */
  private fun readCurrent(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val intent = try {
      context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (_: Exception) {
      null
    }
    return intent?.let { batteryMap(context, it) }
  }

  /** Live updates while the listener is registered; events flow to JS as onBatteryChanged. */
  private fun startListener(): Boolean {
    val context = appContext.reactContext ?: return false
    if (receiver != null) return true

    val newReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        sendEvent("onBatteryChanged", batteryMap(context, intent))
      }
    }

    val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    return try {
      if (Build.VERSION.SDK_INT >= 33) {
        context.registerReceiver(newReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        context.registerReceiver(newReceiver, filter)
      }
      receiver = newReceiver
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun stopListener(): Boolean {
    val context = appContext.reactContext ?: return false
    val current = receiver ?: return true
    return try {
      context.unregisterReceiver(current)
      receiver = null
      true
    } catch (_: Exception) {
      receiver = null
      false
    }
  }

  private fun batteryMap(context: Context, intent: Intent): Map<String, Any?> {
    val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
    val percent = if (level >= 0 && scale > 0) level * 100.0 / scale else null

    val status = when (intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
      BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
      BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "not-charging"
      BatteryManager.BATTERY_STATUS_FULL -> "full"
      else -> "unknown"
    }

    val pluggedValue = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
    val plugged = when (pluggedValue) {
      0 -> "none"
      BatteryManager.BATTERY_PLUGGED_AC -> "ac"
      BatteryManager.BATTERY_PLUGGED_USB -> "usb"
      BatteryManager.BATTERY_PLUGGED_WIRELESS -> "wireless"
      8 -> "dock" // ACTION_BATTERY_CHANGED reports 8 for dock chargers.
      else -> "unknown"
    }

    val health = when (intent.getIntExtra(BatteryManager.EXTRA_HEALTH, -1)) {
      BatteryManager.BATTERY_HEALTH_GOOD -> "good"
      BatteryManager.BATTERY_HEALTH_OVERHEAT -> "overheat"
      BatteryManager.BATTERY_HEALTH_DEAD -> "dead"
      BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "over-voltage"
      BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "failure"
      BatteryManager.BATTERY_HEALTH_COLD -> "cold"
      else -> "unknown"
    }

    val temperatureTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
    val voltageRaw = intent.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1)

    val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager

    // Android 14+ puts the cycle count in the sticky broadcast itself.
    val cycleCount = intent.getIntExtra(BatteryManager.EXTRA_CYCLE_COUNT, -1).takeIf { it > 0 }

    return mapOf(
      "level" to level,
      "scale" to scale,
      "percent" to percent,
      "status" to status,
      "plugged" to plugged,
      "health" to health,
      "temperatureC" to if (temperatureTenths != Int.MIN_VALUE) temperatureTenths / 10.0 else null,
      "voltageMv" to if (voltageRaw >= 0) voltageRaw else null,
      "technology" to intent.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY),
      "currentNowUa" to readableProperty(batteryManager, BatteryManager.BATTERY_PROPERTY_CURRENT_NOW),
      "chargeCounterUah" to readableProperty(batteryManager, BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER),
      "cycleCount" to cycleCount,
      "powerSave" to (powerManager?.isPowerSaveMode ?: false)
    )
  }

  /** getIntProperty returns Integer.MIN_VALUE when the device does not expose a property. */
  private fun readableProperty(batteryManager: BatteryManager?, property: Int): Int? {
    if (batteryManager == null) return null
    return try {
      val value = batteryManager.getIntProperty(property)
      if (value == Int.MIN_VALUE) null else value
    } catch (_: Exception) {
      null
    }
  }
}
