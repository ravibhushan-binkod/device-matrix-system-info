package expo.modules.networkext

import android.app.AppOpsManager
import android.app.usage.NetworkStats
import android.app.usage.NetworkStatsManager
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothStatusCodes
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.ScanResult
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.nfc.NfcAdapter
import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.Inet6Address

/**
 * Network readings through public Android APIs only: the active connection
 * (type, metered, VPN, Data Saver, airplane mode, Private DNS, operator,
 * IP/gateway/DNS/subnet/proxy), the Wi-Fi link details, the Bluetooth and NFC
 * radio states, the Wi-Fi scan list and the traffic statistics behind Usage
 * Access. Nothing is toggled here — changing Wi-Fi, Bluetooth or NFC always
 * goes through the matching system Settings screen.
 *
 * Reads that Android may block (Bluetooth state on 12+, SSID without the
 * location permission, mobile data without the phone-state permission) come
 * back as `null`; the TypeScript wrappers turn that into a `denied` result so
 * the UI can offer the permission instead of faking a value.
 */
class NetworkExtModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NetworkExt")

    Function("getConnectivityInfo") {
      connectivityInfo()
    }

    Function("getWifiInfo") {
      wifiInfo()
    }

    Function("getBluetoothInfo") {
      bluetoothInfo()
    }

    Function("getNfcInfo") {
      nfcInfo()
    }

    /** Starts a Wi-Fi scan; Android throttles these (about four per two minutes). */
    Function("startWifiScan") {
      startWifiScan()
    }

    /** The scan cache with each result's age; needs a Wi-Fi scan permission. */
    Function("getWifiScanResults") {
      wifiScanResults()
    }

    /** Wi-Fi band/standard support, Bluetooth LE capabilities and all system features. */
    Function("getConnectivityCapabilities") {
      connectivityCapabilities()
    }

    /** Wi-Fi/mobile traffic per time bucket; runs off the JS thread. */
    AsyncFunction("getDataUsage") { startMs: Double, endMs: Double, bucketMs: Double ->
      dataUsage(startMs.toLong(), endMs.toLong(), bucketMs.toLong())
    }

    /** Per-app traffic totals; runs off the JS thread. */
    AsyncFunction("getDataUsageTopApps") { startMs: Double, endMs: Double ->
      dataUsageTopApps(startMs.toLong(), endMs.toLong())
    }
  }

  private fun connectivityInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      ?: return null

    val active = manager.activeNetwork
    val capabilities = active?.let { manager.getNetworkCapabilities(it) }

    val type = when {
      capabilities == null -> "none"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_USB) -> "usb"
      else -> "other"
    }

    val link = active?.let { manager.getLinkProperties(it) }
    val linkAddresses = link?.linkAddresses ?: emptyList()
    val ipv4 = linkAddresses
      .firstOrNull { it.address is Inet4Address }
      ?.address?.hostAddress
    val ipv6 = linkAddresses
      .firstOrNull { it.address is Inet6Address && !it.address.isLinkLocalAddress }
      ?.address?.hostAddress
    // Some carriers report the unspecified address ("::") as the default
    // route gateway, so pick the first usable one and prefer IPv4.
    val gateway = link?.routes
      ?.asSequence()
      ?.filter { route ->
        route.gateway != null &&
          (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || route.isDefaultRoute)
      }
      ?.mapNotNull { it.gateway?.takeUnless { address -> address.isAnyLocalAddress } }
      ?.sortedBy { if (it is Inet4Address) 0 else 1 }
      ?.firstOrNull()
      ?.hostAddress
      ?.substringBefore('%')
    val dnsServers = link?.dnsServers
      ?.filter { !it.isLinkLocalAddress }
      ?.mapNotNull { it.hostAddress }
      ?: emptyList()

    // The IPv4 subnet prefix length, e.g. /24 for a home network.
    val subnetPrefix = linkAddresses
      .firstOrNull { it.address is Inet4Address }
      ?.prefixLength

    // A manually configured proxy; hidden on modern Android unless Wi-Fi is
    // set to "Manual" in the network's settings.
    val proxy = try {
      link?.httpProxy?.takeIf { it.isValid }
    } catch (_: Exception) {
      null
    }
    val proxyHost = proxy?.takeIf { it.pacFileUrl == null }?.host?.takeIf { it.isNotBlank() }
    val proxyPort = proxy?.takeIf { it.pacFileUrl == null }?.port?.takeIf { it in 1..65535 }
    val proxyPacUrl = proxy?.pacFileUrl?.toString()?.takeIf { it.isNotBlank() }

    // Roaming is meaningful for the cellular network; the capability is public
    // and needs no permission, unlike the phone-state read.
    val roaming = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && type == "cellular") {
      capabilities?.let { !it.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_ROAMING) }
    } else {
      null
    }

    // Data Saver: `getRestrictBackgroundStatus` is the supported API and the
    // `data_saver_mode` settings key is absent on some builds (it read back
    // null on the test device, wrongly showing "Not available").
    val dataSaver = try {
      when (manager.restrictBackgroundStatus) {
        ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED,
        ConnectivityManager.RESTRICT_BACKGROUND_STATUS_WHITELISTED -> true
        ConnectivityManager.RESTRICT_BACKGROUND_STATUS_DISABLED -> false
        else -> null
      }
    } catch (_: Exception) {
      null
    }

    val airplaneMode = try {
      Settings.Global.getInt(context.contentResolver, Settings.Global.AIRPLANE_MODE_ON, 0) == 1
    } catch (_: Exception) {
      null
    }

    val operatorName = try {
      if (context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
        val telephony = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        telephony?.networkOperatorName?.takeIf { it.isNotBlank() }
      } else {
        null
      }
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "type" to type,
      "metered" to manager.isActiveNetworkMetered,
      "vpn" to (capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true),
      "dataSaver" to dataSaver,
      "airplaneMode" to airplaneMode,
      "privateDnsMode" to readGlobalString(context, "private_dns_mode"),
      "privateDnsHost" to readGlobalString(context, "private_dns_specifier"),
      "operatorName" to operatorName,
      "roaming" to roaming,
      "ipv4" to ipv4,
      "ipv6" to ipv6,
      "subnetPrefix" to subnetPrefix,
      "gateway" to gateway,
      "dnsServers" to dnsServers,
      "proxyHost" to proxyHost,
      "proxyPort" to proxyPort,
      "proxyPacUrl" to proxyPacUrl
    )
  }

  private fun readGlobalString(context: Context, key: String): String? = try {
    Settings.Global.getString(context.contentResolver, key)
  } catch (_: Exception) {
    null
  }

  @Suppress("DEPRECATION")
  private fun wifiInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      ?: return null

    val info: WifiInfo? = try {
      manager.connectionInfo
    } catch (_: Exception) {
      null
    }

    val enabled = try {
      manager.isWifiEnabled
    } catch (_: Exception) {
      null
    }

    // Whether the radio can use 5 GHz at all — the tips engine uses it to tell
    // "the router is on 2.4 GHz" apart from "this phone only does 2.4 GHz".
    val fiveGhzSupported = try {
      manager.is5GHzBandSupported
    } catch (_: Exception) {
      null
    }

    // Android redacts the SSID ("<unknown ssid>") without the location
    // permission; link speed, frequency and RSSI stay readable.
    val ssid = info?.ssid
      ?.removeSurrounding("\"")
      ?.takeIf { it.isNotEmpty() && it != UNKNOWN_SSID }

    val standard = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        info?.wifiStandard?.takeIf { it > 0 }
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    // TX/RX link speeds arrived with Android 11; the plain link speed stays as
    // the fallback for older builds.
    val txLinkSpeed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        info?.txLinkSpeedMbps?.takeIf { it > 0 }
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }
    val rxLinkSpeed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        info?.rxLinkSpeedMbps?.takeIf { it > 0 }
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    // WifiInfo carries no channel width; the scan cache does. Matching the
    // connected BSSID needs a scan permission — without one this stays null
    // and the UI says "hidden until allowed", not a made-up width.
    val channelWidth = try {
      @Suppress("DEPRECATION")
      val scans: List<ScanResult>? = manager.scanResults
      val bssid = info?.bssid
      if (bssid == null) {
        null
      } else {
        scans?.firstOrNull { it.BSSID != null && it.BSSID.equals(bssid, ignoreCase = true) }
          ?.channelWidth
          ?.takeIf { it >= 0 }
      }
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "enabled" to enabled,
      "fiveGhzSupported" to fiveGhzSupported,
      "connected" to (info != null && info.networkId != -1),
      "ssid" to ssid,
      "linkSpeedMbps" to info?.linkSpeed?.takeIf { it > 0 },
      "txLinkSpeedMbps" to txLinkSpeed,
      "rxLinkSpeedMbps" to rxLinkSpeed,
      "frequencyMhz" to info?.frequency?.takeIf { it > 0 },
      "rssiDbm" to info?.rssi?.takeIf { it != 0 && it > -127 },
      "standardCode" to standard,
      "channelWidth" to channelWidth
    )
  }

  private fun bluetoothInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter

    // Android 12+ requires BLUETOOTH_CONNECT for the state; without it the
    // read throws and the value stays null for the wrapper to classify.
    val enabled = try {
      adapter?.isEnabled
    } catch (_: SecurityException) {
      null
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "present" to (adapter != null),
      "enabled" to enabled,
      "leSupported" to context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
    )
  }

  private fun nfcInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null

    val adapter = try {
      NfcAdapter.getDefaultAdapter(context)
    } catch (_: Exception) {
      null
    }

    val enabled = try {
      adapter?.isEnabled
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "present" to (adapter != null),
      "enabled" to enabled
    )
  }

  @Suppress("DEPRECATION")
  private fun startWifiScan(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      ?: return null

    val throttleEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        manager.isScanThrottleEnabled
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return try {
      val started = manager.startScan()
      mapOf(
        "started" to started,
        "throttled" to !started,
        "scanThrottleEnabled" to throttleEnabled
      )
    } catch (_: SecurityException) {
      // No scan permission — the wrapper reports the denied result.
      null
    } catch (_: Exception) {
      null
    }
  }

  @Suppress("DEPRECATION")
  private fun wifiScanResults(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      ?: return null

    val results: List<ScanResult> = try {
      manager.scanResults
    } catch (_: SecurityException) {
      return null
    } catch (_: Exception) {
      return null
    }

    val now = SystemClock.elapsedRealtime()
    val networks = ArrayList<Map<String, Any?>>(results.size)
    var newestAge: Long? = null
    for (result in results) {
      try {
        val age = (now - result.timestamp / 1000L).coerceAtLeast(0L)
        if (newestAge == null || age < newestAge) newestAge = age
        networks.add(
          mapOf(
            // Android redacts the name and address when the permission is missing.
            "ssid" to result.SSID?.takeIf { it.isNotEmpty() && it != UNKNOWN_SSID },
            "bssid" to result.BSSID?.takeIf { it.isNotEmpty() && it != REDACTED_BSSID },
            "rssiDbm" to result.level,
            "frequencyMhz" to result.frequency,
            "channelWidth" to result.channelWidth,
            "standardCode" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
              result.wifiStandard.takeIf { it > 0 }
            } else {
              null
            },
            "securityTypes" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
              result.securityTypes?.toList()
            } else {
              null
            },
            "capabilities" to (result.capabilities ?: ""),
            "ageMs" to age
          )
        )
      } catch (_: Exception) {
        // One unreadable result must not hide the rest of the scan.
      }
    }

    val throttleEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        manager.isScanThrottleEnabled
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return mapOf(
      "networks" to networks,
      "scanThrottleEnabled" to throttleEnabled,
      "lastScanAgeMs" to newestAge
    )
  }

  private fun connectivityCapabilities(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    fun boolOrNull(block: () -> Boolean): Boolean? = try {
      block()
    } catch (_: Exception) {
      null
    }

    val wifi = mapOf(
      "fiveGhzSupported" to wifiManager?.let { boolOrNull { it.is5GHzBandSupported } },
      "sixGhzSupported" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        wifiManager?.let { boolOrNull { it.is6GHzBandSupported } }
      } else {
        null
      },
      "standard6Supported" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        wifiManager?.let { boolOrNull { it.isWifiStandardSupported(ScanResult.WIFI_STANDARD_11AX) } }
      } else {
        null
      },
      "standard7Supported" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        wifiManager?.let { boolOrNull { it.isWifiStandardSupported(ScanResult.WIFI_STANDARD_11BE) } }
      } else {
        null
      },
      "scanThrottleEnabled" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        wifiManager?.let { boolOrNull { it.isScanThrottleEnabled } }
      } else {
        null
      }
    )

    val bluetooth = mapOf(
      // LE Audio arrived with API 33; its feature returns BluetoothStatusCodes.
      "leAudioSupported" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        adapter?.let { boolOrNull { it.isLeAudioSupported == BluetoothStatusCodes.SUCCESS } }
      } else {
        null
      },
      "le2mPhySupported" to adapter?.let { boolOrNull { it.isLe2MPhySupported } },
      "leCodedPhySupported" to adapter?.let { boolOrNull { it.isLeCodedPhySupported } },
      "leExtendedAdvertisingSupported" to adapter?.let {
        boolOrNull { it.isLeExtendedAdvertisingSupported }
      },
      "lePeriodicAdvertisingSupported" to adapter?.let {
        boolOrNull { it.isLePeriodicAdvertisingSupported }
      },
      "multipleAdvertisementSupported" to adapter?.let {
        boolOrNull { it.isMultipleAdvertisementSupported }
      },
      "offloadedScanBatchingSupported" to adapter?.let {
        boolOrNull { it.isOffloadedScanBatchingSupported }
      }
    )

    // Every feature the OS reports for this device — the Connectivity screen's
    // searchable list. No permission is needed to read the feature list.
    val systemFeatures = try {
      context.packageManager.systemAvailableFeatures
        ?.mapNotNull { it.name?.takeIf { name -> name.isNotBlank() } }
        ?: emptyList()
    } catch (_: Exception) {
      emptyList()
    }

    return mapOf(
      "systemFeatures" to systemFeatures,
      "wifi" to wifi,
      "bluetooth" to bluetooth
    )
  }

  /** Reads the PACKAGE_USAGE_STATS app-op; true only when Android says allowed. */
  private fun isUsageAccessGranted(): Boolean {
    val context = appContext.reactContext ?: return false
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

  private fun dataUsage(startMs: Long, endMs: Long, bucketMs: Long): Map<String, Any?> {
    val context = appContext.reactContext ?: return emptyMap()
    val manager = context.getSystemService(Context.NETWORK_STATS_SERVICE) as? NetworkStatsManager
    val usageAccess = isUsageAccessGranted()
    if (!usageAccess || manager == null) {
      return mapOf(
        "usageAccess" to usageAccess,
        "wifi" to null,
        "mobile" to null,
        "mobileBlocked" to false
      )
    }

    val start = minOf(startMs, endMs)
    val end = maxOf(startMs, endMs)
    // At most 64 buckets, so one range never turns into hundreds of binder calls.
    val bucket = maxOf(bucketMs.coerceAtLeast(60_000L), (end - start + 63L) / 64L)

    val wifi = try {
      querySeries(manager, ConnectivityManager.TYPE_WIFI, start, end, bucket)
    } catch (_: Exception) {
      null
    }

    var mobileBlocked = false
    val mobile = try {
      querySeries(manager, ConnectivityManager.TYPE_MOBILE, start, end, bucket)
    } catch (_: SecurityException) {
      // Android 10+ withholds mobile figures without the phone-state permission.
      mobileBlocked = true
      null
    } catch (_: Exception) {
      mobileBlocked = true
      null
    }

    return mapOf(
      "usageAccess" to true,
      "wifi" to wifi,
      "mobile" to mobile,
      "mobileBlocked" to mobileBlocked
    )
  }

  /** One series of per-bucket rx/tx totals; null when a bucket cannot be read. */
  private fun querySeries(
    manager: NetworkStatsManager,
    networkType: Int,
    startMs: Long,
    endMs: Long,
    bucketMs: Long
  ): Map<String, Any?>? {
    val buckets = ArrayList<Map<String, Any?>>()
    var rxTotal = 0L
    var txTotal = 0L
    var from = startMs
    while (from < endMs) {
      val to = minOf(from + bucketMs, endMs)
      val bucket = try {
        manager.querySummaryForDevice(networkType, null, from, to)
      } catch (error: SecurityException) {
        // Callers distinguish "permission withheld" from "read failed".
        throw error
      } catch (_: Exception) {
        return null
      }
      val rx = bucket.rxBytes.coerceAtLeast(0L)
      val tx = bucket.txBytes.coerceAtLeast(0L)
      buckets.add(mapOf("startMs" to from, "endMs" to to, "rxBytes" to rx, "txBytes" to tx))
      rxTotal += rx
      txTotal += tx
      from = to
    }
    return mapOf("buckets" to buckets, "rxBytes" to rxTotal, "txBytes" to txTotal)
  }

  private fun dataUsageTopApps(startMs: Long, endMs: Long): Map<String, Any?> {
    val context = appContext.reactContext ?: return emptyMap()
    val manager = context.getSystemService(Context.NETWORK_STATS_SERVICE) as? NetworkStatsManager
    val usageAccess = isUsageAccessGranted()
    if (!usageAccess || manager == null) {
      return mapOf(
        "usageAccess" to usageAccess,
        "apps" to emptyList<Map<String, Any?>>(),
        "mobileBlocked" to false
      )
    }

    val start = minOf(startMs, endMs)
    val end = maxOf(startMs, endMs)
    // [wifiRx, wifiTx, mobileRx, mobileTx]
    val totals = HashMap<Int, LongArray>()

    fun collect(networkType: Int): Boolean {
      var stats: NetworkStats? = null
      return try {
        stats = manager.queryDetails(networkType, null, start, end)
        val bucket = NetworkStats.Bucket()
        val offset = if (networkType == ConnectivityManager.TYPE_WIFI) 0 else 2
        while (stats.getNextBucket(bucket)) {
          val uid = bucket.uid
          if (uid < 0) continue
          val entry = totals.getOrPut(uid) { LongArray(4) }
          entry[offset] += bucket.rxBytes.coerceAtLeast(0L)
          entry[offset + 1] += bucket.txBytes.coerceAtLeast(0L)
        }
        true
      } catch (_: Exception) {
        false
      } finally {
        try {
          stats?.close()
        } catch (_: Exception) {
          // Closing is best effort.
        }
      }
    }

    collect(ConnectivityManager.TYPE_WIFI)
    val mobileOk = collect(ConnectivityManager.TYPE_MOBILE)

    val packageManager = context.packageManager
    val apps = totals
      .filter { (_, bytes) -> bytes.sum() > 0L }
      .map { (uid, bytes) ->
        val packageName = packageManager.getNameForUid(uid)
        val label = packageName?.let { name ->
          try {
            packageManager.getApplicationInfo(name, 0).loadLabel(packageManager).toString()
              .takeIf { it.isNotBlank() }
          } catch (_: Exception) {
            null
          }
        }
        mapOf(
          "uid" to uid,
          "packageName" to packageName,
          "label" to label,
          "wifiRxBytes" to bytes[0],
          "wifiTxBytes" to bytes[1],
          "mobileRxBytes" to bytes[2],
          "mobileTxBytes" to bytes[3]
        )
      }

    return mapOf("usageAccess" to true, "apps" to apps, "mobileBlocked" to !mobileOk)
  }

  private companion object {
    /** `WifiManager.UNKNOWN_SSID` — what Android returns when it redacts the name. */
    const val UNKNOWN_SSID = "<unknown ssid>"

    /** What Android returns in place of a BSSID the app may not see. */
    const val REDACTED_BSSID = "02:00:00:00:00:00"
  }
}
