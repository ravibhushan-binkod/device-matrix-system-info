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
import java.time.LocalDate
import java.time.ZoneId

/**
 * The installed-apps bridge behind the Apps tab.
 *
 * Android only shows an app the packages it asked for: this project's manifest
 * carries a `<queries>` entry for the launcher intent — and never
 * QUERY_ALL_PACKAGES — so the module can list exactly the apps that appear in
 * the launcher. Usage and storage figures come from the OS and are readable
 * only while the user has granted Usage Access in system settings; without it
 * the functions return empty lists rather than guesses.
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

    /** Whether the user granted Usage Access (the PACKAGE_USAGE_STATS app-op). */
    Function("hasUsageAccess") {
      isUsageAccessGranted()
    }

    /** Per-app foreground time for the last `days` calendar days (today spans 1 day). */
    AsyncFunction("getUsageTotals") { days: Int ->
      usageTotals(days)
    }

    /** Per-app app, data and cache byte counts; can take a few seconds. */
    AsyncFunction("getStorageStats") {
      storageStats()
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
  private fun packageInfo(packageManager: PackageManager, packageName: String): PackageInfo? = try {
    packageManager.getPackageInfo(packageName, 0)
  } catch (_: PackageManager.NameNotFoundException) {
    null
  }

  @Suppress("DEPRECATION")
  private fun appMap(
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
    return mapOf(
      "packageName" to packageName,
      "label" to label.ifBlank { packageName },
      "versionName" to info.versionName,
      "versionCode" to versionCode.toDouble(),
      "firstInstallTimeMs" to info.firstInstallTime.toDouble(),
      "lastUpdateTimeMs" to info.lastUpdateTime.toDouble(),
      "targetSdk" to application?.targetSdkVersion,
      "system" to (application != null && (application.flags and ApplicationInfo.FLAG_SYSTEM) != 0),
      "icon" to icon?.let { drawableToDataUri(it, iconSizePx) }
    )
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
