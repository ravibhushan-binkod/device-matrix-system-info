package expo.modules.appsext

import android.app.AppOpsManager
import android.app.usage.StorageStatsManager
import android.app.usage.UsageStatsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.PermissionInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Process
import android.os.storage.StorageManager
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale
import java.util.zip.ZipFile

/**
 * The installed-apps bridge behind the Apps tab and the app analyzers.
 *
 * Android only shows an app the packages it asked for: this project's manifest
 * carries two `<queries>` entries — the launcher intent and Google Play
 * services — and never QUERY_ALL_PACKAGES. The launcher entry is what lets the
 * module list exactly the apps that appear in the launcher. Usage, storage and
 * screen-time figures come from the OS and are readable only while the user has
 * granted Usage Access in system settings; without it the functions return
 * empty lists or nulls rather than guesses.
 */
class AppsExtModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppsExt")

    /** Every launcher app with a small PNG icon as a data URI; runs off the JS thread. */
    AsyncFunction("getLauncherApps") { iconSizePx: Int ->
      listLauncherApps(iconSizePx)
    }

    /** One launcher app, or null when Android does not show it to this app. */
    AsyncFunction("getAppDetail") { packageName: String ->
      appDetail(packageName)
    }

    /** Metadata for the analyzer charts: target SDK, installer, install year, dangerous permissions. */
    AsyncFunction("getAppOverview") {
      appOverview()
    }

    /** Apps whose manifest requests any of the comma-separated permissions. */
    AsyncFunction("getPermissionApps") { permissionsCsv: String ->
      permissionApps(permissionsCsv)
    }

    /** One app's permissions, components, signer, native ABIs and sizes. */
    AsyncFunction("getAppAnalyzer") { packageName: String ->
      appAnalyzer(packageName)
    }

    /** Whether the user granted Usage Access (the PACKAGE_USAGE_STATS app-op). */
    Function("hasUsageAccess") {
      isUsageAccessGranted()
    }

    /** Per-app foreground time for the last `days` calendar days (today spans 1 day). */
    AsyncFunction("getUsageTotals") { days: Int ->
      usageTotals(days)
    }

    /** Screen time for `days`, with a daily series and each app's last-used time. */
    AsyncFunction("getScreenTime") { days: Int ->
      screenTime(days)
    }

    /** Per-app app, data and cache byte counts; can take a few seconds. */
    AsyncFunction("getStorageStats") {
      storageStats()
    }

    /** Copies one app's base APK into this app's cache for the share sheet. */
    AsyncFunction("extractApk") { packageName: String ->
      extractApk(packageName)
    }

    /** Opens the system "App info" screen for a package. */
    Function("openAppInfo") { packageName: String ->
      launch {
        try {
          start(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
              data = Uri.fromParts("package", packageName, null)
            }
          )
        } catch (_: ActivityNotFoundException) {
          // Some stripped-down builds only expose the full app list.
          start(Intent(Settings.ACTION_APPLICATION_SETTINGS))
        }
      }
    }
  }

  private fun context(): Context? = appContext.reactContext

  /** Package names that have a launcher entry, in launcher order, without duplicates. */
  private fun launcherPackages(packageManager: PackageManager): List<String> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    @Suppress("DEPRECATION")
    val activities = try {
      packageManager.queryIntentActivities(intent, 0)
    } catch (_: Exception) {
      emptyList()
    }
    val seen = LinkedHashSet<String>()
    for (resolve in activities) {
      resolve.activityInfo?.packageName?.let { seen.add(it) }
    }
    return seen.toList()
  }

  private fun listLauncherApps(iconSizePx: Int): List<Map<String, Any?>> {
    val context = context() ?: return emptyList()
    val packageManager = context.packageManager
    val iconPx = iconSizePx.coerceIn(16, 128)
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    @Suppress("DEPRECATION")
    val activities = try {
      packageManager.queryIntentActivities(intent, 0)
    } catch (_: Exception) {
      return emptyList()
    }
    val seen = HashSet<String>()
    val apps = ArrayList<Map<String, Any?>>(activities.size)
    for (resolve in activities) {
      val packageName = resolve.activityInfo?.packageName ?: continue
      if (!seen.add(packageName)) continue
      try {
        val info = packageInfo(packageManager, packageName) ?: continue
        apps.add(
          appMap(
            packageManager = packageManager,
            packageName = packageName,
            label = resolve.loadLabel(packageManager).toString(),
            info = info,
            icon = resolve.loadIcon(packageManager),
            iconSizePx = iconPx
          )
        )
      } catch (_: Exception) {
        // One unreadable or vanished package must not hide the others.
      }
    }
    return apps
  }

  private fun appDetail(packageName: String): Map<String, Any?>? {
    val context = context() ?: return null
    val packageManager = context.packageManager
    return try {
      val info = packageInfo(packageManager, packageName) ?: return null
      val application = info.applicationInfo
      val iconPx = (48 * context.resources.displayMetrics.density).toInt().coerceIn(16, 128)
      appMap(
        packageManager = packageManager,
        packageName = packageName,
        label = application?.loadLabel(packageManager)?.toString() ?: packageName,
        info = info,
        icon = application?.loadIcon(packageManager),
        iconSizePx = iconPx
      )
    } catch (_: Exception) {
      null
    }
  }

  @Suppress("DEPRECATION")
  private fun packageInfo(
    packageManager: PackageManager,
    packageName: String,
    flags: Int = 0
  ): PackageInfo? = try {
    packageManager.getPackageInfo(packageName, flags)
  } catch (_: PackageManager.NameNotFoundException) {
    null
  } catch (_: Exception) {
    null
  }

  @Suppress("DEPRECATION")
  private fun appMap(
    packageManager: PackageManager,
    packageName: String,
    label: String,
    info: PackageInfo,
    icon: Drawable?,
    iconSizePx: Int
  ): Map<String, Any?> {
    val application = info.applicationInfo
    val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.longVersionCode
    } else {
      info.versionCode.toLong()
    }
    val installer = installerDetails(packageManager, packageName)
    return mapOf(
      "packageName" to packageName,
      "label" to label.ifBlank { packageName },
      "versionName" to info.versionName,
      "versionCode" to versionCode.toDouble(),
      "firstInstallTimeMs" to info.firstInstallTime.toDouble(),
      "lastUpdateTimeMs" to info.lastUpdateTime.toDouble(),
      "targetSdk" to application?.targetSdkVersion,
      "minSdk" to application?.minSdkVersion,
      "system" to (application != null && (application.flags and ApplicationInfo.FLAG_SYSTEM) != 0),
      "icon" to icon?.let { drawableToDataUri(it, iconSizePx) },
      "installerPackage" to installer.first,
      "installerLabel" to installer.second
    )
  }

  /** Installing package and its app label; both null when Android reports neither. */
  @Suppress("DEPRECATION")
  private fun installerDetails(
    packageManager: PackageManager,
    packageName: String
  ): Pair<String?, String?> {
    val installer = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val source = packageManager.getInstallSourceInfo(packageName)
        source.installingPackageName ?: source.initiatingPackageName
      } else {
        packageManager.getInstallerPackageName(packageName)
      }
    } catch (_: Exception) {
      null
    }
    val label = installer?.let {
      try {
        packageManager.getApplicationInfo(it, 0).loadLabel(packageManager).toString()
      } catch (_: Exception) {
        null
      }
    }
    return installer to label
  }

  private fun appOverview(): List<Map<String, Any?>> {
    val context = context() ?: return emptyList()
    val packageManager = context.packageManager
    val groups = HashMap<String, String>()
    val result = ArrayList<Map<String, Any?>>()
    for (packageName in launcherPackages(packageManager)) {
      try {
        val info = packageInfo(packageManager, packageName, PackageManager.GET_PERMISSIONS)
          ?: continue
        val application = info.applicationInfo
        val installer = installerDetails(packageManager, packageName)
        var dangerous = 0
        info.requestedPermissions?.forEach { permission ->
          if (permissionProtection(packageManager, permission, groups) == "dangerous") {
            dangerous += 1
          }
        }
        result.add(
          mapOf(
            "packageName" to packageName,
            "label" to (application?.loadLabel(packageManager)?.toString() ?: packageName),
            "targetSdk" to application?.targetSdkVersion,
            "installerPackage" to installer.first,
            "installerLabel" to installer.second,
            "firstInstallTimeMs" to info.firstInstallTime.toDouble(),
            "dangerousPermissionCount" to dangerous,
            "system" to (application != null &&
              (application.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
          )
        )
      } catch (_: Exception) {
        // Skip one unreadable package, keep the rest.
      }
    }
    return result
  }

  private fun permissionProtection(
    packageManager: PackageManager,
    permission: String,
    cache: MutableMap<String, String>
  ): String {
    cache[permission]?.let { return it }
    val protection = try {
      val info = packageManager.getPermissionInfo(permission, 0)
      when (info.protectionLevel and PermissionInfo.PROTECTION_MASK_BASE) {
        PermissionInfo.PROTECTION_DANGEROUS -> "dangerous"
        PermissionInfo.PROTECTION_SIGNATURE,
        PermissionInfo.PROTECTION_SIGNATURE_OR_SYSTEM -> "signature"
        PermissionInfo.PROTECTION_NORMAL -> "normal"
        else -> "other"
      }
    } catch (_: Exception) {
      "other"
    }
    cache[permission] = protection
    return protection
  }

  private fun permissionApps(permissionsCsv: String): List<Map<String, Any?>> {
    val targets = permissionsCsv
      .split(',')
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .toSet()
    if (targets.isEmpty()) return emptyList()
    val context = context() ?: return emptyList()
    val packageManager = context.packageManager
    val result = ArrayList<Map<String, Any?>>()
    for (packageName in launcherPackages(packageManager)) {
      try {
        val info = packageInfo(packageManager, packageName, PackageManager.GET_PERMISSIONS)
          ?: continue
        val requested = info.requestedPermissions
          ?.filter { targets.contains(it) }
          ?.distinct()
          ?: emptyList()
        if (requested.isEmpty()) continue
        val granted = requested.filter { permission ->
          try {
            packageManager.checkPermission(permission, packageName) ==
              PackageManager.PERMISSION_GRANTED
          } catch (_: Exception) {
            false
          }
        }
        result.add(
          mapOf(
            "packageName" to packageName,
            "requested" to requested,
            "granted" to granted
          )
        )
      } catch (_: Exception) {
        // Skip one unreadable package, keep the rest.
      }
    }
    return result
  }

  @Suppress("DEPRECATION")
  private fun appAnalyzer(packageName: String): Map<String, Any?>? {
    val context = context() ?: return null
    val packageManager = context.packageManager
    var flags = PackageManager.GET_PERMISSIONS or
      PackageManager.GET_ACTIVITIES or
      PackageManager.GET_SERVICES or
      PackageManager.GET_RECEIVERS or
      PackageManager.GET_PROVIDERS
    flags = flags or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      PackageManager.GET_SIGNING_CERTIFICATES
    } else {
      PackageManager.GET_SIGNATURES
    }
    val info = packageInfo(packageManager, packageName, flags) ?: return null
    val application = info.applicationInfo
    val installer = installerDetails(packageManager, packageName)
    val groups = HashMap<String, String>()
    val permissions = info.requestedPermissions?.map { permission ->
      mapOf(
        "name" to permission,
        "protection" to permissionProtection(packageManager, permission, groups),
        "granted" to (try {
          packageManager.checkPermission(permission, packageName) ==
            PackageManager.PERMISSION_GRANTED
        } catch (_: Exception) {
          false
        })
      )
    } ?: emptyList()
    val storage = packageStorage(context, packageName)
    return mapOf(
      "packageName" to packageName,
      "minSdk" to application?.minSdkVersion,
      "targetSdk" to application?.targetSdkVersion,
      "installerPackage" to installer.first,
      "installerLabel" to installer.second,
      "debuggable" to (application != null &&
        (application.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0),
      "signerSha256" to signingSha256(info),
      "abis" to nativeAbis(info),
      "permissions" to permissions,
      "activities" to componentNames(packageName, info.activities?.mapNotNull { it.name }),
      "services" to componentNames(packageName, info.services?.mapNotNull { it.name }),
      "receivers" to componentNames(packageName, info.receivers?.mapNotNull { it.name }),
      "providers" to componentNames(packageName, info.providers?.mapNotNull { it.name }),
      "appBytes" to storage.first,
      "dataBytes" to storage.second,
      "cacheBytes" to storage.third
    )
  }

  @Suppress("DEPRECATION")
  private fun signingSha256(info: PackageInfo): List<String> {
    val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.signingInfo?.apkContentsSigners
    } else {
      info.signatures
    } ?: return emptyList()
    return signatures
      .map { signature ->
        val digest = MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
        digest.joinToString(":") { byte -> String.format(Locale.US, "%02X", byte) }
      }
      .distinct()
  }

  /** ABI directory names in the APK; empty means the app ships no native libraries. */
  private fun nativeAbis(info: PackageInfo): List<String> {
    val application = info.applicationInfo ?: return emptyList()
    val sources = ArrayList<String>()
    application.sourceDir?.let { sources.add(it) }
    application.splitSourceDirs?.let { sources.addAll(it) }
    val abis = LinkedHashSet<String>()
    for (source in sources) {
      try {
        ZipFile(source).use { zip ->
          val entries = zip.entries()
          while (entries.hasMoreElements()) {
            val name = entries.nextElement().name
            if (!name.startsWith("lib/")) continue
            val abi = name.removePrefix("lib/").substringBefore('/')
            if (abi.isNotEmpty()) abis.add(abi)
          }
        }
      } catch (_: Exception) {
        // The APK may be unreadable; keep whatever other sources reported.
      }
    }
    return abis.sorted()
  }

  private fun componentNames(packageName: String, names: List<String>?): List<String> =
    names
      ?.map { name ->
        when {
          name.startsWith(".") -> packageName + name
          !name.contains(".") -> "$packageName.$name"
          else -> name
        }
      }
      ?.distinct()
      ?.sorted()
      ?: emptyList()

  /** App + data + cache bytes; nulls when Usage Access is missing or Android refuses. */
  private fun packageStorage(
    context: Context,
    packageName: String
  ): Triple<Double?, Double?, Double?> {
    val manager = context.getSystemService(Context.STORAGE_STATS_SERVICE) as? StorageStatsManager
      ?: return Triple(null, null, null)
    return try {
      val stats = manager.queryStatsForPackage(
        StorageManager.UUID_DEFAULT,
        packageName,
        Process.myUserHandle()
      )
      Triple(
        stats.appBytes.toDouble(),
        stats.dataBytes.toDouble(),
        stats.cacheBytes.toDouble()
      )
    } catch (_: Exception) {
      Triple(null, null, null)
    }
  }

  private fun isUsageAccessGranted(): Boolean {
    val context = context() ?: return false
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    return try {
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) {
      false
    }
  }

  private fun usageTotals(days: Int): List<Map<String, Any?>> {
    val context = context() ?: return emptyList()
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return emptyList()
    val span = days.coerceIn(1, 31)
    val zone = ZoneId.systemDefault()
    val start = LocalDate.now(zone)
      .minusDays((span - 1).toLong())
      .atStartOfDay(zone)
      .toInstant()
      .toEpochMilli()
    val stats = try {
      manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, System.currentTimeMillis())
    } catch (_: Exception) {
      null
    } ?: return emptyList()
    val totals = HashMap<String, Long>()
    for (entry in stats) {
      if (entry.totalTimeInForeground <= 0) continue
      totals[entry.packageName] = (totals[entry.packageName] ?: 0L) + entry.totalTimeInForeground
    }
    return totals.map { (packageName, timeMs) ->
      mapOf("packageName" to packageName, "totalTimeMs" to timeMs.toDouble())
    }
  }

  /** Per-day totals plus per-app totals and last-used times for the range. */
  private fun screenTime(days: Int): Map<String, Any?> {
    val empty = mapOf<String, Any?>(
      "totalTimeMs" to 0.0,
      "daily" to emptyList<Map<String, Any?>>(),
      "apps" to emptyList<Map<String, Any?>>()
    )
    val context = context() ?: return empty
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return empty
    val span = days.coerceIn(1, 31)
    val zone = ZoneId.systemDefault()
    val firstDay = LocalDate.now(zone).minusDays((span - 1).toLong())
    val now = System.currentTimeMillis()
    val perApp = HashMap<String, Long>()
    val lastUsed = HashMap<String, Long>()
    val daily = ArrayList<Map<String, Any?>>(span)
    var total = 0L

    for (offset in 0 until span) {
      val day = firstDay.plusDays(offset.toLong())
      val start = day.atStartOfDay(zone).toInstant().toEpochMilli()
      val end = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
      val queryEnd = minOf(end, now)
      var dayTotal = 0L
      if (queryEnd > start) {
        val stats = try {
          manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, queryEnd)
        } catch (_: Exception) {
          null
        } ?: emptyList()
        for (entry in stats) {
          val time = entry.totalTimeInForeground
          if (time <= 0) continue
          dayTotal += time
          perApp[entry.packageName] = (perApp[entry.packageName] ?: 0L) + time
          lastUsed[entry.packageName] = maxOf(
            lastUsed[entry.packageName] ?: 0L,
            entry.lastTimeUsed
          )
        }
      }
      total += dayTotal
      daily.add(
        mapOf(
          "startMs" to start.toDouble(),
          "totalTimeMs" to dayTotal.toDouble()
        )
      )
    }

    val apps = perApp.entries
      .sortedWith(compareByDescending<Map.Entry<String, Long>> { it.value }.thenBy { it.key })
      .map { (packageName, timeMs) ->
        mapOf(
          "packageName" to packageName,
          "totalTimeMs" to timeMs.toDouble(),
          "lastUsedMs" to (lastUsed[packageName] ?: 0L).toDouble()
        )
      }
    return mapOf(
      "totalTimeMs" to total.toDouble(),
      "daily" to daily,
      "apps" to apps
    )
  }

  private fun storageStats(): List<Map<String, Any?>> {
    val context = context() ?: return emptyList()
    val manager = context.getSystemService(Context.STORAGE_STATS_SERVICE) as? StorageStatsManager
      ?: return emptyList()
    val user = Process.myUserHandle()
    val result = ArrayList<Map<String, Any?>>()
    for (packageName in launcherPackages(context.packageManager)) {
      try {
        val stats = manager.queryStatsForPackage(StorageManager.UUID_DEFAULT, packageName, user)
        result.add(
          mapOf(
            "packageName" to packageName,
            "appBytes" to stats.appBytes.toDouble(),
            "dataBytes" to stats.dataBytes.toDouble(),
            "cacheBytes" to stats.cacheBytes.toDouble()
          )
        )
      } catch (_: Exception) {
        // Packages without readable stats are skipped, never estimated.
      }
    }
    return result
  }

  private fun extractApk(packageName: String): Map<String, Any?>? {
    val context = context() ?: return null
    val packageManager = context.packageManager
    val info = packageInfo(packageManager, packageName) ?: return null
    val application = info.applicationInfo ?: return null
    val sourcePath = application.sourceDir ?: return null
    val source = File(sourcePath)
    if (!source.isFile || !source.canRead()) return null
    return try {
      val label = try {
        application.loadLabel(packageManager).toString()
      } catch (_: Exception) {
        packageName
      }
      val version = info.versionName?.takeIf { it.isNotBlank() } ?: "apk"
      val safeName = "$label-$version"
        .replace(Regex("[^A-Za-z0-9._-]"), "_")
        .take(80)
        .ifBlank { "app" }
      val directory = File(context.cacheDir, "apk-export").apply { mkdirs() }
      directory.listFiles()?.forEach { it.delete() }
      val destination = File(directory, "$safeName.apk")
      source.inputStream().use { input ->
        destination.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      mapOf(
        "uri" to Uri.fromFile(destination).toString(),
        "fileName" to destination.name,
        "sizeBytes" to destination.length().toDouble()
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun drawableToDataUri(drawable: Drawable, sizePx: Int): String? = try {
    val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, sizePx, sizePx)
    drawable.draw(canvas)
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    bitmap.recycle()
    "data:image/png;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
  } catch (_: Exception) {
    null
  }

  /** `{ launched: true }` on success, or `{ launched: false, reason: … }` when nothing could open. */
  private fun launch(block: () -> Unit): Map<String, Any?> = try {
    block()
    mapOf("launched" to true, "reason" to null)
  } catch (_: ActivityNotFoundException) {
    mapOf("launched" to false, "reason" to "no-handler")
  } catch (_: SecurityException) {
    mapOf("launched" to false, "reason" to "blocked")
  } catch (_: Exception) {
    mapOf("launched" to false, "reason" to "failed")
  }

  private fun start(intent: Intent) {
    val context: Context = appContext.reactContext
      ?: throw IllegalStateException("The Android context is not available.")
    val activity = appContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      // Launching from the application context needs its own task.
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
