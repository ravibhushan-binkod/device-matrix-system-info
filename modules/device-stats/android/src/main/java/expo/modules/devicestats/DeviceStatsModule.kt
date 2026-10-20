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
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

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

    /** Thermal zones from sysfs — only the zones this device lets the app read. */
    Function("getThermalZones") {
      thermalZones()
    }

    Function("getOsInfo") {
      osInfo()
    }

    Function("getBuildInfo") {
      buildInfo()
    }

    Function("getDeveloperSettings") {
      developerSettings()
    }
  }

  /**
   * The Settings.Global switches the tips engine reads: developer options,
   * USB debugging and the animation scale (the largest of the three scales,
   * which is what "animations are slowed down" comes down to). A read the
   * build restricts stays `null` — never a guessed value.
   */
  private fun developerSettings(): Map<String, Any?> {
    val resolver = appContext.reactContext?.contentResolver
    if (resolver == null) {
      return mapOf("developerOptions" to null, "usbDebugging" to null, "animationScale" to null)
    }

    fun readFlag(key: String): Boolean? = try {
      when (Settings.Global.getInt(resolver, key, -1)) {
        -1 -> null
        0 -> false
        else -> true
      }
    } catch (_: Exception) {
      null
    }

    val animationScale = try {
      listOf(
        Settings.Global.ANIMATOR_DURATION_SCALE,
        Settings.Global.WINDOW_ANIMATION_SCALE,
        Settings.Global.TRANSITION_ANIMATION_SCALE
      ).mapNotNull { key ->
        val value = Settings.Global.getFloat(resolver, key, -1f)
        if (value.isFinite() && value >= 0f) value.toDouble() else null
      }.maxOrNull()
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "developerOptions" to readFlag(Settings.Global.DEVELOPMENT_SETTINGS_ENABLED),
      "usbDebugging" to readFlag(Settings.Global.ADB_ENABLED),
      "animationScale" to animationScale
    )
  }

  /** Kernel, Play services and SELinux state — values Build itself does not expose. */
  private fun osInfo(): Map<String, Any?> {
    val kernel = try {
      System.getProperty("os.version")?.takeIf { it.isNotBlank() }
    } catch (_: Exception) {
      null
    }

    val developerOptions = try {
      val context = appContext.reactContext
      if (context == null) {
        null
      } else {
        val value = Settings.Global.getInt(
          context.contentResolver,
          Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
          -1
        )
        if (value == -1) null else value != 0
      }
    } catch (_: Exception) {
      // Some vendors restrict reading this global setting; report it as unavailable.
      null
    }

    return mapOf(
      "kernel" to kernel,
      "developerOptions" to developerOptions,
      "playServicesVersion" to playServicesVersion(),
      "selinuxMode" to selinuxMode()
    )
  }

  /**
   * Google Play services version. Readable only because the manifest carries a
   * `<queries>` entry for the package (see plugins/with-gms-queries.js) — a
   * plain read of another package is filtered out by Android 11+ otherwise.
   */
  @Suppress("DEPRECATION")
  private fun playServicesVersion(): String? = try {
    appContext.reactContext
      ?.packageManager
      ?.getPackageInfo("com.google.android.gms", 0)
      ?.versionName
      ?.takeIf { it.isNotBlank() }
  } catch (_: Exception) {
    null
  }

  /** SELinux mode from the sysfs flag; `null` when the platform makes it unreadable. */
  private fun selinuxMode(): String? = try {
    when (File("/sys/fs/selinux/enforce").readText().trim()) {
      "1" -> "enforcing"
      "0" -> "permissive"
      else -> null
    }
  } catch (_: Exception) {
    null
  }

  /**
   * First API level the device shipped with. The platform keeps
   * `Build.VERSION.DEVICE_INITIAL_SDK_INT` behind a system API, but the same
   * read-only value is the `ro.product.first_api_level` property, which the
   * public `getprop` tool prints. `null` when the property is hidden.
   */
  private fun firstApiLevel(): Int? = try {
    val process = Runtime.getRuntime().exec(
      arrayOf("/system/bin/getprop", "ro.product.first_api_level")
    )
    val output = process.inputStream.bufferedReader().use { it.readText() }.trim()
    process.waitFor()
    process.destroy()
    output.toIntOrNull()?.takeIf { it > 0 }
  } catch (_: Exception) {
    null
  }

  /** Device identity and build facts that `Build` carries but Expo packages do not surface. */
  private fun buildInfo(): Map<String, Any?> {
    val firstApiLevel = firstApiLevel()

    return mapOf(
      "brand" to Build.BRAND,
      "model" to Build.MODEL,
      "manufacturer" to Build.MANUFACTURER,
      "board" to Build.BOARD,
      "product" to Build.PRODUCT,
      "device" to Build.DEVICE,
      "hardware" to Build.HARDWARE,
      "bootloader" to Build.BOOTLOADER,
      "buildId" to Build.ID,
      "fingerprint" to Build.FINGERPRINT,
      "securityPatch" to Build.VERSION.SECURITY_PATCH,
      "buildTimeMillis" to Build.TIME.toDouble(),
      "androidVersion" to Build.VERSION.RELEASE,
      "apiLevel" to Build.VERSION.SDK_INT,
      "firstApiLevel" to firstApiLevel
    )
  }

  private fun memoryInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return null
    val info = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(info)

    // Swap (usually zram-backed) from /proc/meminfo; `null` when unreadable.
    val meminfo = meminfo()
    val swapTotalKb = meminfo?.get("SwapTotal")
    val swapFreeKb = meminfo?.get("SwapFree")
    val swapCachedKb = meminfo?.get("SwapCached")

    return mapOf(
      "totalBytes" to info.totalMem,
      "availBytes" to info.availMem,
      "thresholdBytes" to info.threshold,
      "lowMemory" to info.lowMemory,
      "swapTotalBytes" to swapTotalKb?.let { (it * 1024).toLong() },
      "swapFreeBytes" to swapFreeKb?.let { (it * 1024).toLong() },
      "swapCachedBytes" to swapCachedKb?.let { (it * 1024).toLong() }
    )
  }

  /** `/proc/meminfo` as key → kB. `null` when the kernel hides the file. */
  private fun meminfo(): Map<String, Double>? {
    val text = try {
      File("/proc/meminfo").readText()
    } catch (_: Exception) {
      return null
    }

    val values = HashMap<String, Double>()
    for (line in text.lineSequence()) {
      val separator = line.indexOf(':')
      if (separator <= 0) continue
      val key = line.substring(0, separator)
      val amount = line.substring(separator + 1).trim().split(' ').firstOrNull()
      val parsed = amount?.toDoubleOrNull() ?: continue
      values[key] = parsed
    }
    return values
  }

  private fun storageInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val mounts = mountTypes()

    val internal = try {
      val dataPath = Environment.getDataDirectory().absolutePath
      val stat = StatFs(dataPath)
      mapOf(
        "totalBytes" to stat.totalBytes,
        "freeBytes" to stat.availableBytes,
        "fsType" to mounts?.let { fsTypeFor(dataPath, it) }
      )
    } catch (_: Exception) {
      null
    }

    val volumes = try {
      val storageManager = context.getSystemService(Context.STORAGE_SERVICE) as? StorageManager
      storageManager?.storageVolumes?.map { volume -> volumeInfo(context, volume, mounts) }
    } catch (_: Exception) {
      null
    }

    if (internal == null && volumes == null) return null
    return mapOf(
      "internal" to internal,
      "volumes" to (volumes ?: emptyList<Map<String, Any?>>())
    )
  }

  /**
   * Mount point → file system type from the kernel mount table. Only the app's
   * own mount namespace is visible, which is exactly the honest answer.
   */
  private fun mountTypes(): Map<String, String>? {
    for (source in listOf("/proc/self/mounts", "/proc/mounts")) {
      val text = try {
        File(source).readText()
      } catch (_: Exception) {
        continue
      }

      val types = HashMap<String, String>()
      for (line in text.lineSequence()) {
        val parts = line.split(' ')
        if (parts.size < 3) continue
        val mountPoint = parts[1].replace("\\040", " ")
        types[mountPoint] = parts[2]
      }
      if (types.isNotEmpty()) return types
    }
    return null
  }

  /** The file system of the deepest mount point that contains `path`. */
  private fun fsTypeFor(path: String, mounts: Map<String, String>): String? {
    var best: String? = null
    var bestLength = -1
    for ((mountPoint, fsType) in mounts) {
      val prefix = mountPoint.trimEnd('/')
      if (path != mountPoint && !path.startsWith("$prefix/")) continue
      if (mountPoint.length > bestLength) {
        best = fsType
        bestLength = mountPoint.length
      }
    }
    return best
  }

  private fun volumeInfo(
    context: Context,
    volume: StorageVolume,
    mounts: Map<String, String>?
  ): Map<String, Any?> {
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
      "fsType" to (path?.let { mounts?.let { table -> fsTypeFor(it, table) } }),
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

  /**
   * Thermal zone names and temperatures from `/sys/class/thermal`. Vendors
   * ship different zone sets and most builds deny app reads entirely; only
   * the zones that answer are returned, and `null` means the path is blocked
   * on this device (never an empty list pretending to be the truth).
   */
  private fun thermalZones(): List<Map<String, Any?>>? {
    val root = File("/sys/class/thermal")
    val directories = try {
      root.listFiles { file -> file.isDirectory && file.name.startsWith("thermal_zone") }
    } catch (_: Exception) {
      null
    } ?: return null

    return directories.sortedBy { it.name }.mapNotNull { directory ->
      val type = try {
        File(directory, "type").readText().trim().takeIf { it.isNotEmpty() }
      } catch (_: Exception) {
        null
      }
      val temperatureC = try {
        val raw = File(directory, "temp").readText().trim().toDoubleOrNull()
        if (raw == null) null else raw / 1000.0
      } catch (_: Exception) {
        null
      }
      if (type == null && temperatureC == null) {
        null
      } else {
        mapOf("name" to (type ?: directory.name), "temperatureC" to temperatureC)
      }
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
