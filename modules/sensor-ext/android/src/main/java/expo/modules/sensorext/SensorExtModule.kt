package expo.modules.sensorext

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The full sensor list plus one live stream at a time. expo-sensors only
 * exposes a fixed set of named sensors; this module streams any listed type
 * and is stopped again when the screen leaves.
 */
class SensorExtModule : Module() {
  private var registered: Sensor? = null

  private val listener = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) {
      sendEvent(
        "onSensorChanged",
        mapOf(
          "type" to event.sensor.type,
          "values" to event.values.toList(),
          "accuracy" to event.accuracy
        )
      )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  override fun definition() = ModuleDefinition {
    Name("SensorExt")

    Events("onSensorChanged")

    Function("getSensors") {
      sensorList()
    }

    Function("startSensor") { type: Int ->
      start(type)
    }

    Function("stopSensor") {
      stop()
    }

    OnDestroy {
      stop()
    }
  }

  private fun sensorManager(): SensorManager? {
    val context = appContext.reactContext ?: return null
    return context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
  }

  private fun sensorList(): List<Map<String, Any?>>? {
    val manager = sensorManager() ?: return null
    val sensors = try {
      manager.getSensorList(Sensor.TYPE_ALL)
    } catch (_: Exception) {
      return null
    }

    return sensors.map { sensor ->
      mapOf(
        "type" to sensor.type,
        "name" to sensor.name,
        "vendor" to sensor.vendor,
        "version" to sensor.version,
        "stringType" to try {
          sensor.stringType
        } catch (_: Exception) {
          null
        },
        "maxRange" to sensor.maximumRange.toDouble(),
        "resolution" to sensor.resolution.toDouble(),
        "powerMa" to sensor.power.toDouble(),
        "minDelayUs" to sensor.minDelay,
        "maxDelayUs" to maxDelayUs(sensor),
        "fifoMaxEventCount" to fifoMaxEventCount(sensor),
        "fifoReservedEventCount" to fifoReservedEventCount(sensor),
        "isWakeUp" to isWakeUp(sensor),
        "reportingMode" to reportingModeName(sensor)
      )
    }
  }

  /** `Sensor.getMaxDelay()` is Android 8+; `null` when the platform hides it. */
  private fun maxDelayUs(sensor: Sensor): Int? = try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) sensor.maxDelay else null
  } catch (_: Exception) {
    null
  }

  private fun fifoMaxEventCount(sensor: Sensor): Int? = try {
    sensor.fifoMaxEventCount
  } catch (_: Exception) {
    null
  }

  private fun fifoReservedEventCount(sensor: Sensor): Int? = try {
    sensor.fifoReservedEventCount
  } catch (_: Exception) {
    null
  }

  private fun isWakeUp(sensor: Sensor): Boolean = try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) sensor.isWakeUpSensor else false
  } catch (_: Exception) {
    false
  }

  private fun reportingModeName(sensor: Sensor): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return null
    return try {
      when (sensor.reportingMode) {
        Sensor.REPORTING_MODE_CONTINUOUS -> "continuous"
        Sensor.REPORTING_MODE_ON_CHANGE -> "on-change"
        Sensor.REPORTING_MODE_ONE_SHOT -> "one-shot"
        Sensor.REPORTING_MODE_SPECIAL_TRIGGER -> "special"
        else -> null
      }
    } catch (_: Exception) {
      null
    }
  }

  /**
   * Registers the UI-rate listener for one sensor type. Returns false when the
   * device does not have the sensor or the OS refuses the registration (for
   * example step counters without the activity-recognition permission).
   */
  private fun start(type: Int): Boolean {
    val manager = sensorManager() ?: return false
    stop()

    val sensor = try {
      manager.getDefaultSensor(type)
    } catch (_: Exception) {
      null
    } ?: return false

    val ok = try {
      manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI)
    } catch (_: Exception) {
      false
    }
    if (ok) registered = sensor
    return ok
  }

  private fun stop(): Boolean {
    val manager = sensorManager() ?: return false
    val sensor = registered ?: return true
    return try {
      manager.unregisterListener(listener, sensor)
      registered = null
      true
    } catch (_: Exception) {
      registered = null
      false
    }
  }
}
