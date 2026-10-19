package expo.modules.networkext

import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.nfc.NfcAdapter
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.Inet6Address

/**
 * Network readings through public Android APIs only: the active connection
 * (type, metered, VPN, Data Saver, airplane mode, Private DNS, operator,
 * IP/gateway/DNS), the Wi-Fi link details, plus the Bluetooth and NFC radio
 * states. Nothing is toggled here — changing Wi-Fi, Bluetooth or NFC always
 * goes through the matching system Settings screen.
 *
 * Reads that Android may block (Bluetooth state on 12+, SSID without the
 * location permission) come back as `null`; the TypeScript wrappers turn that
 * into a `denied` result so the UI can offer the permission instead of faking
 * a value.
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
      "ipv4" to ipv4,
      "ipv6" to ipv6,
      "gateway" to gateway,
      "dnsServers" to dnsServers
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

    return mapOf(
      "enabled" to enabled,
      "fiveGhzSupported" to fiveGhzSupported,
      "connected" to (info != null && info.networkId != -1),
      "ssid" to ssid,
      "linkSpeedMbps" to info?.linkSpeed?.takeIf { it > 0 },
      "frequencyMhz" to info?.frequency?.takeIf { it > 0 },
      "rssiDbm" to info?.rssi?.takeIf { it != 0 && it > -127 },
      "standardCode" to standard
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

  private companion object {
    /** `WifiManager.UNKNOWN_SSID` — what Android returns when it redacts the name. */
    const val UNKNOWN_SSID = "<unknown ssid>"
  }
}
