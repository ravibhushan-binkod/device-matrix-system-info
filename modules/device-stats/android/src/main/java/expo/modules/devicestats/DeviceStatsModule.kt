package expo.modules.devicestats

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs
import android.os.SystemClock
import android.os.storage.StorageManager
import android.os.storage.StorageVolume
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeviceStatsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeviceStats")

    Function("getMemoryInfo") {
      memoryInfo()
    }

    Function("getStorageInfo") {
      storageInfo()
    }

    Function("getUptime") {
      mapOf("uptimeMillis" to SystemClock.elapsedRealtime())
    }

    Function("getThermalStatus") {
      thermalStatus()
    }
  }

  private fun memoryInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return null
    val info = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(info)
    return mapOf(
      "totalBytes" to info.totalMem,
      "availBytes" to info.availMem,
      "thresholdBytes" to info.threshold,
      "lowMemory" to info.lowMemory
    )
  }

  private fun storageInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null

    val internal = try {
      val stat = StatFs(Environment.getDataDirectory().absolutePath)
      mapOf("totalBytes" to stat.totalBytes, "freeBytes" to stat.availableBytes)
    } catch (_: Exception) {
      null
    }

    val volumes = try {
      val storageManager = context.getSystemService(Context.STORAGE_SERVICE) as? StorageManager
      storageManager?.storageVolumes?.map { volume -> volumeInfo(context, volume) }
    } catch (_: Exception) {
      null
    }

    if (internal == null && volumes == null) return null
    return mapOf(
      "internal" to internal,
      "volumes" to (volumes ?: emptyList<Map<String, Any?>>())
    )
  }

  private fun volumeInfo(context: Context, volume: StorageVolume): Map<String, Any?> {
    val path = volumePath(volume)

    var totalBytes: Long? = null
    var freeBytes: Long? = null
    if (path != null) {
      try {
        val stat = StatFs(path)
        totalBytes = stat.totalBytes
        freeBytes = stat.availableBytes
      } catch (_: Exception) {
        // Some volumes are only readable by the system; leave their sizes unavailable.
      }
    }

    val description = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        volume.getDescription(context)?.toString()
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return mapOf(
      "description" to description,
      "isPrimary" to volume.isPrimary,
      "isRemovable" to volume.isRemovable,
      "state" to volume.state,
      "uuid" to volume.uuid,
      "path" to path,
      "totalBytes" to totalBytes,
      "freeBytes" to freeBytes
    )
  }

  /** The mount path is public from Android 11; before that only a hidden getter exists. */
  private fun volumePath(volume: StorageVolume): String? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      return try {
        volume.directory?.absolutePath
      } catch (_: Exception) {
        null
      }
    }
    return try {
      val method = volume.javaClass.getMethod("getPath")
      method.invoke(volume) as? String
    } catch (_: Exception) {
      null
    }
  }

  private fun thermalStatus(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      ?: return null

    val statusCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      try {
        powerManager.currentThermalStatus
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    val headroom = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val value = powerManager.getThermalHeadroom(10)
        if (value.isNaN()) null else value.toDouble()
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return mapOf(
      "statusCode" to statusCode,
      "status" to statusCode?.let { thermalStatusName(it) },
      "headroom" to headroom,
      "headroomForecastSeconds" to 10
    )
  }

  private fun thermalStatusName(statusCode: Int): String = when (statusCode) {
    PowerManager.THERMAL_STATUS_NONE -> "none"
    PowerManager.THERMAL_STATUS_LIGHT -> "light"
    PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
    PowerManager.THERMAL_STATUS_SEVERE -> "severe"
    PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
    PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency"
    PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown"
    else -> "unknown"
  }
}
