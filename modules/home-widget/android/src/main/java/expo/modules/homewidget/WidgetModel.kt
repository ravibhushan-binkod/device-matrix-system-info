package expo.modules.homewidget

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs
import java.util.Locale
import kotlin.math.roundToInt
import kotlin.math.roundToLong

internal enum class WidgetTheme {
  SYSTEM,
  LIGHT,
  DARK;

  companion object {
    fun fromKey(key: String?): WidgetTheme =
      values().firstOrNull { it.name.equals(key, ignoreCase = true) } ?: SYSTEM
  }
}

internal enum class WidgetAccent(
  val labelRes: Int,
  val lightColor: Int,
  val darkColor: Int,
) {
  CYAN(R.string.widget_accent_cyan, 0xFF0E7490.toInt(), 0xFF22D3EE.toInt()),
  BLUE(R.string.widget_accent_blue, 0xFF2563EB.toInt(), 0xFF4F8CFF.toInt()),
  VIOLET(R.string.widget_accent_violet, 0xFF7C3AED.toInt(), 0xFFA78BFA.toInt()),
  GREEN(R.string.widget_accent_green, 0xFF147A39.toInt(), 0xFF22C55E.toInt()),
  AMBER(R.string.widget_accent_amber, 0xFFA15C00.toInt(), 0xFFFBBF24.toInt()),
  ROSE(R.string.widget_accent_rose, 0xFFBE123C.toInt(), 0xFFFB7185.toInt()),
  TEAL(R.string.widget_accent_teal, 0xFF0F766E.toInt(), 0xFF2DD4BF.toInt()),
  INDIGO(R.string.widget_accent_indigo, 0xFF4338CA.toInt(), 0xFF818CF8.toInt());

  companion object {
    fun fromKey(key: String?): WidgetAccent =
      values().firstOrNull { it.name.equals(key, ignoreCase = true) } ?: CYAN
  }
}

internal enum class WidgetTransparency(val labelRes: Int) {
  SOLID(R.string.widget_transparency_solid),
  SOFT(R.string.widget_transparency_soft),
  CLEAR(R.string.widget_transparency_clear);

  companion object {
    fun fromKey(key: String?, legacyTranslucent: Boolean): WidgetTransparency {
      values().firstOrNull { it.name.equals(key, ignoreCase = true) }?.let { return it }
      return if (legacyTranslucent) CLEAR else SOLID
    }
  }
}

internal data class WidgetAppearance(
  val theme: WidgetTheme,
  val accent: WidgetAccent,
  val transparency: WidgetTransparency,
  val motion: Boolean,
  /** Exact app accent colour used when the user chose "Match app". */
  val accentLight: Int? = null,
  val accentDark: Int? = null,
)

internal object WidgetPrefs {
  private const val APPEARANCE_PREFS = "device_matrix_widget_appearance"
  private const val UNIT_PREFS = "device_matrix_widget"
  private const val KEY_THEME = "theme"
  private const val KEY_ACCENT = "accent"
  private const val KEY_ACCENT_LIGHT = "accent_light"
  private const val KEY_ACCENT_DARK = "accent_dark"
  private const val KEY_TRANSPARENCY = "transparency"
  private const val KEY_MOTION = "motion"
  private const val KEY_MOTION_PHASE = "motion_phase"
  private const val KEY_TRANSLUCENT_LEGACY = "translucent"
  private const val KEY_DEFAULT_THEME = "default_theme"
  private const val KEY_DEFAULT_ACCENT = "default_accent"
  private const val KEY_DEFAULT_ACCENT_LIGHT = "default_accent_light"
  private const val KEY_DEFAULT_ACCENT_DARK = "default_accent_dark"
  private const val KEY_REFRESH_ALL = "last_refresh_all"
  private const val REFRESH_THROTTLE_MS = 2_000L

  fun appearance(context: Context, widgetId: Int): WidgetAppearance {
    val prefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    val hasOwnAccent = prefs.contains(key(KEY_ACCENT, widgetId))
    val accentLight = if (hasOwnAccent) {
      prefs.getString(key(KEY_ACCENT_LIGHT, widgetId), null)
    } else {
      prefs.getString(KEY_DEFAULT_ACCENT_LIGHT, null)
    }?.toIntOrNull()
    val accentDark = if (hasOwnAccent) {
      prefs.getString(key(KEY_ACCENT_DARK, widgetId), null)
    } else {
      prefs.getString(KEY_DEFAULT_ACCENT_DARK, null)
    }?.toIntOrNull()

    return WidgetAppearance(
      theme = WidgetTheme.fromKey(
        prefs.getString(
          key(KEY_THEME, widgetId),
          prefs.getString(KEY_DEFAULT_THEME, null),
        ),
      ),
      accent = WidgetAccent.fromKey(
        prefs.getString(
          key(KEY_ACCENT, widgetId),
          prefs.getString(KEY_DEFAULT_ACCENT, null),
        ),
      ),
      transparency = WidgetTransparency.fromKey(
        prefs.getString(key(KEY_TRANSPARENCY, widgetId), null),
        prefs.getBoolean(key(KEY_TRANSLUCENT_LEGACY, widgetId), false),
      ),
      motion = prefs.getBoolean(key(KEY_MOTION, widgetId), true),
      accentLight = accentLight,
      accentDark = accentDark,
    )
  }

  fun save(context: Context, widgetId: Int, appearance: WidgetAppearance) {
    val editor = context
      .getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(key(KEY_THEME, widgetId), appearance.theme.name.lowercase(Locale.US))
      .putString(key(KEY_ACCENT, widgetId), appearance.accent.name.lowercase(Locale.US))
      .putString(
        key(KEY_TRANSPARENCY, widgetId),
        appearance.transparency.name.lowercase(Locale.US),
      )
      .putBoolean(key(KEY_MOTION, widgetId), appearance.motion)
      .remove(key(KEY_TRANSLUCENT_LEGACY, widgetId))
    putOptionalColor(editor, key(KEY_ACCENT_LIGHT, widgetId), appearance.accentLight)
    putOptionalColor(editor, key(KEY_ACCENT_DARK, widgetId), appearance.accentDark)
    editor.apply()
  }

  /**
   * Applies the Widgets screen theme/accent to every placed widget while
   * preserving each instance's transparency and motion choices, and records
   * the defaults for widgets added later.
   */
  fun saveThemeAndAccent(
    context: Context,
    theme: WidgetTheme,
    accent: WidgetAccent,
    accentLight: Int?,
    accentDark: Int?,
  ) {
    val prefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    val editor = prefs
      .edit()
      .putString(KEY_DEFAULT_THEME, theme.name.lowercase(Locale.US))
      .putString(KEY_DEFAULT_ACCENT, accent.name.lowercase(Locale.US))
    putOptionalColor(editor, KEY_DEFAULT_ACCENT_LIGHT, accentLight)
    putOptionalColor(editor, KEY_DEFAULT_ACCENT_DARK, accentDark)
    editor.apply()

    val manager = android.appwidget.AppWidgetManager.getInstance(context)
    for (type in WidgetType.values()) {
      val ids = manager.getAppWidgetIds(
        android.content.ComponentName(context, type.providerClass),
      )
      if (ids.isEmpty()) continue
      val data = WidgetData.read(context)
      for (widgetId in ids) {
        val current = appearance(context, widgetId)
        save(
          context,
          widgetId,
          current.copy(
            theme = theme,
            accent = accent,
            accentLight = accentLight,
            accentDark = accentDark,
          ),
        )
        WidgetRenderer.render(context, manager, widgetId, type, data)
      }
    }
  }

  fun themeAndAccent(
    context: Context,
  ): Map<String, Any?> {
    val prefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    val accentLight = prefs.getString(KEY_DEFAULT_ACCENT_LIGHT, null)?.toIntOrNull()
    val accentDark = prefs.getString(KEY_DEFAULT_ACCENT_DARK, null)?.toIntOrNull()
    return mapOf(
      "theme" to WidgetTheme.fromKey(prefs.getString(KEY_DEFAULT_THEME, null)).name.lowercase(
        Locale.US,
      ),
      "accent" to WidgetAccent.fromKey(prefs.getString(KEY_DEFAULT_ACCENT, null)).name.lowercase(
        Locale.US,
      ),
      "matchApp" to (accentLight != null && accentDark != null),
      "accentLight" to accentLight,
      "accentDark" to accentDark,
    )
  }

  private fun putOptionalColor(
    editor: android.content.SharedPreferences.Editor,
    key: String,
    color: Int?,
  ) {
    if (color == null) {
      editor.remove(key)
    } else {
      editor.putString(key, color.toString())
    }
  }

  /**
   * ViewFlipper only runs the crossfade when the displayed child changes. The
   * phase is per instance, so every widget keeps its own appearance and no
   * shared loop or background work is introduced.
   */
  fun nextMotionPhase(context: Context, widgetId: Int): Int {
    val prefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    val key = key(KEY_MOTION_PHASE, widgetId)
    val next = if (prefs.getInt(key, 0) == 0) 1 else 0
    prefs.edit().putInt(key, next).apply()
    return next
  }

  fun clear(context: Context, widgetIds: IntArray) {
    val editor = context
      .getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
      .edit()
    for (widgetId in widgetIds) {
      editor.remove(key(KEY_THEME, widgetId))
      editor.remove(key(KEY_ACCENT, widgetId))
      editor.remove(key(KEY_ACCENT_LIGHT, widgetId))
      editor.remove(key(KEY_ACCENT_DARK, widgetId))
      editor.remove(key(KEY_TRANSPARENCY, widgetId))
      editor.remove(key(KEY_MOTION, widgetId))
      editor.remove(key(KEY_MOTION_PHASE, widgetId))
      editor.remove(key(KEY_TRANSLUCENT_LEGACY, widgetId))
    }
    editor.apply()
  }

  /** The app mirrors its resolved storage unit here; decimal is the safe default. */
  fun storageIsBinary(context: Context): Boolean =
    context
      .getSharedPreferences(UNIT_PREFS, Context.MODE_PRIVATE)
      .getString("storageUnit", "decimal") == "binary"

  /**
   * One shared throttle for all widgets: a refresh action updates every placed
   * Device Matrix widget, so a burst of taps must not repeat that whole pass.
   */
  fun tryAcquireRefreshAll(context: Context): Boolean {
    val prefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    val now = System.currentTimeMillis()
    val last = prefs.getLong(KEY_REFRESH_ALL, 0L)
    if (now - last < REFRESH_THROTTLE_MS) return false
    prefs.edit().putLong(KEY_REFRESH_ALL, now).apply()
    return true
  }

  private fun key(prefix: String, widgetId: Int): String = "${prefix}_$widgetId"
}

internal enum class BatteryStatus(val labelRes: Int) {
  CHARGING(R.string.widget_charging),
  ON_BATTERY(R.string.widget_on_battery),
  FULL(R.string.widget_full),
  NOT_CHARGING(R.string.widget_not_charging),
  UNKNOWN(R.string.widget_status_unknown),
}

internal enum class BatteryPlug {
  AC,
  USB,
  WIRELESS,
  DOCK,
  NONE,
  UNKNOWN,
}

internal enum class BatteryHealth {
  GOOD,
  OVERHEAT,
  DEAD,
  OVER_VOLTAGE,
  FAILURE,
  COLD,
  UNKNOWN,
}

internal enum class ThermalStatusName {
  NONE,
  LIGHT,
  MODERATE,
  SEVERE,
  CRITICAL,
  EMERGENCY,
  SHUTDOWN,
}

internal sealed interface WidgetReading {
  data class Ram(
    val usedBytes: Long,
    val totalBytes: Long,
    val availableBytes: Long,
    val percent: Int,
  ) : WidgetReading

  data class Storage(
    val usedBytes: Long,
    val totalBytes: Long,
    val availableBytes: Long,
    val percent: Int,
  ) : WidgetReading

  data class Battery(
    val percent: Int?,
    val status: BatteryStatus,
    val plugged: BatteryPlug,
    val health: BatteryHealth,
    val temperatureC: Double?,
  ) : WidgetReading
}

internal data class WidgetThermal(
  val status: ThermalStatusName?,
  val headroom: Double?,
)

internal data class WidgetData(
  val ram: WidgetReading.Ram?,
  val storage: WidgetReading.Storage?,
  val battery: WidgetReading.Battery,
  val thermal: WidgetThermal,
  val securityPatch: String?,
  val health: HealthResult,
  val deviceName: String,
) {
  companion object {
    fun read(context: Context): WidgetData {
      val now = System.currentTimeMillis()
      val ram = RamReader.read(context)
      val storage = StorageReader.read(context)
      val battery = BatteryReader.read(context)
      val thermal = ThermalReader.read(context)
      val securityPatch = Build.VERSION.SECURITY_PATCH
        ?.trim()
        ?.takeIf { it.isNotEmpty() && !it.equals("unknown", ignoreCase = true) }
      val health = HealthScore.compute(
        storageFreeRatio = storage?.let { safeRatio(it.availableBytes, it.totalBytes) },
        memoryUsedRatio = ram?.let { safeRatio(it.usedBytes, it.totalBytes) },
        batteryHealth = battery.health,
        batteryTemperatureC = battery.temperatureC,
        thermalStatus = thermal.status,
        thermalHeadroom = thermal.headroom,
        now = now,
      )

      return WidgetData(
        ram = ram,
        storage = storage,
        battery = battery,
        thermal = thermal,
        securityPatch = securityPatch,
        health = health,
        deviceName = DeviceLabel.read(),
      )
    }

    private fun safeRatio(value: Long, total: Long): Double? {
      if (total <= 0L) return null
      return value.coerceIn(0L, total).toDouble() / total.toDouble()
    }
  }
}

internal object RamReader {
  fun read(context: Context): WidgetReading.Ram? {
    return try {
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        ?: return null
      val info = ActivityManager.MemoryInfo()
      manager.getMemoryInfo(info)
      if (info.totalMem <= 0L) return null

      val availableBytes = info.availMem.coerceIn(0L, info.totalMem)
      val usedBytes = info.totalMem - availableBytes
      val percent = ((usedBytes.toDouble() / info.totalMem.toDouble()) * 100.0)
        .roundToInt()
        .coerceIn(0, 100)

      WidgetReading.Ram(
        usedBytes = usedBytes,
        totalBytes = info.totalMem,
        availableBytes = availableBytes,
        percent = percent,
      )
    } catch (_: Exception) {
      null
    }
  }
}

internal object StorageReader {
  fun read(context: Context): WidgetReading.Storage? {
    return try {
      val dataPath = Environment.getDataDirectory().absolutePath
      val stat = StatFs(dataPath)
      if (stat.totalBytes <= 0L) return null
      val total = stat.totalBytes
      val available = stat.availableBytes.coerceIn(0L, total)
      val used = total - available
      val percent = ((used.toDouble() / total.toDouble()) * 100.0)
        .roundToInt()
        .coerceIn(0, 100)

      WidgetReading.Storage(
        usedBytes = used,
        totalBytes = total,
        availableBytes = available,
        percent = percent,
      )
    } catch (_: Exception) {
      null
    }
  }
}

internal object BatteryReader {
  fun read(context: Context): WidgetReading.Battery {
    val sticky = try {
      context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (_: Exception) {
      null
    }

    var percent: Int? = null
    if (sticky != null) {
      val level = sticky.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
      val scale = sticky.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
      if (level >= 0 && scale > 0) {
        percent = ((level.toDouble() / scale.toDouble()) * 100.0)
          .roundToInt()
          .coerceIn(0, 100)
      }
    }

    val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
    if (percent == null) {
      val capacity = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
      if (capacity != null && capacity in 0..100) percent = capacity
    }

    val status = when (sticky?.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
      BatteryManager.BATTERY_STATUS_CHARGING -> BatteryStatus.CHARGING
      BatteryManager.BATTERY_STATUS_DISCHARGING -> BatteryStatus.ON_BATTERY
      BatteryManager.BATTERY_STATUS_FULL -> BatteryStatus.FULL
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> BatteryStatus.NOT_CHARGING
      else -> if (batteryManager?.isCharging == true) {
        BatteryStatus.CHARGING
      } else {
        BatteryStatus.UNKNOWN
      }
    }

    val plugged = when (sticky?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1)) {
      BatteryManager.BATTERY_PLUGGED_AC -> BatteryPlug.AC
      BatteryManager.BATTERY_PLUGGED_USB -> BatteryPlug.USB
      BatteryManager.BATTERY_PLUGGED_WIRELESS -> BatteryPlug.WIRELESS
      BatteryManager.BATTERY_PLUGGED_DOCK -> BatteryPlug.DOCK
      0 -> BatteryPlug.NONE
      else -> BatteryPlug.UNKNOWN
    }

    val health = when (sticky?.getIntExtra(BatteryManager.EXTRA_HEALTH, -1)) {
      BatteryManager.BATTERY_HEALTH_GOOD -> BatteryHealth.GOOD
      BatteryManager.BATTERY_HEALTH_OVERHEAT -> BatteryHealth.OVERHEAT
      BatteryManager.BATTERY_HEALTH_DEAD -> BatteryHealth.DEAD
      BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> BatteryHealth.OVER_VOLTAGE
      BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> BatteryHealth.FAILURE
      BatteryManager.BATTERY_HEALTH_COLD -> BatteryHealth.COLD
      else -> BatteryHealth.UNKNOWN
    }

    val temperatureC = if (sticky?.hasExtra(BatteryManager.EXTRA_TEMPERATURE) == true) {
      sticky.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        .takeIf { it != Int.MIN_VALUE }
        ?.div(10.0)
        ?.takeIf { it.isFinite() }
    } else {
      null
    }

    return WidgetReading.Battery(
      percent = percent,
      status = status,
      plugged = plugged,
      health = health,
      temperatureC = temperatureC,
    )
  }
}

internal object ThermalReader {
  fun read(context: Context): WidgetThermal {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      ?: return WidgetThermal(null, null)

    val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      when (powerManager.currentThermalStatus) {
        PowerManager.THERMAL_STATUS_NONE -> ThermalStatusName.NONE
        PowerManager.THERMAL_STATUS_LIGHT -> ThermalStatusName.LIGHT
        PowerManager.THERMAL_STATUS_MODERATE -> ThermalStatusName.MODERATE
        PowerManager.THERMAL_STATUS_SEVERE -> ThermalStatusName.SEVERE
        PowerManager.THERMAL_STATUS_CRITICAL -> ThermalStatusName.CRITICAL
        PowerManager.THERMAL_STATUS_EMERGENCY -> ThermalStatusName.EMERGENCY
        PowerManager.THERMAL_STATUS_SHUTDOWN -> ThermalStatusName.SHUTDOWN
        else -> null
      }
    } else {
      null
    }

    val headroom = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        powerManager.getThermalHeadroom(10).takeIf { it.isFinite() }?.toDouble()
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return WidgetThermal(status = status, headroom = headroom)
  }
}

internal object DeviceLabel {
  fun read(): String {
    val brand = Build.BRAND?.trim()?.takeIf { it.isNotEmpty() && !it.equals("unknown", true) }
    val manufacturer = Build.MANUFACTURER
      ?.trim()
      ?.takeIf { it.isNotEmpty() && !it.equals("unknown", true) }
    val maker = (brand ?: manufacturer)
      ?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
    val model = Build.MODEL
      ?.trim()
      ?.takeIf { it.isNotEmpty() && !it.equals("unknown", true) }

    return listOfNotNull(maker, model).joinToString(" ").trim().ifBlank { "This device" }
  }
}

internal data class WidgetColors(
  val background: Int,
  val text: Int,
  val muted: Int,
  val accent: Int,
  val track: Int,
  val refreshIcon: Int,
  val good: Int,
  val warning: Int,
  val critical: Int,
  val iconBorder: Int,
  val sheenSoft: Int,
  val sheenBright: Int,
)

internal fun resolveWidgetColors(context: Context, appearance: WidgetAppearance): WidgetColors {
  val night = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
    Configuration.UI_MODE_NIGHT_YES
  val dark = when (appearance.theme) {
    WidgetTheme.SYSTEM -> night
    WidgetTheme.LIGHT -> false
    WidgetTheme.DARK -> true
  }
  val accent = if (dark) {
    appearance.accentDark ?: appearance.accent.darkColor
  } else {
    appearance.accentLight ?: appearance.accent.lightColor
  }

  val background = when (appearance.transparency) {
    WidgetTransparency.SOLID ->
      if (dark) R.drawable.widget_card_dark else R.drawable.widget_card_light
    WidgetTransparency.SOFT ->
      if (dark) R.drawable.widget_card_dark_soft else R.drawable.widget_card_light_soft
    WidgetTransparency.CLEAR ->
      if (dark) R.drawable.widget_card_dark_clear else R.drawable.widget_card_light_clear
  }

  return WidgetColors(
    background = background,
    text = if (dark) 0xFFE8EEF5.toInt() else 0xFF111827.toInt(),
    muted = if (dark) 0xFFB3C0CF.toInt() else 0xFF475569.toInt(),
    accent = accent,
    track = if (dark) 0x33E8EEF5 else 0x33111827,
    refreshIcon = if (dark) R.drawable.ic_widget_refresh_dark else R.drawable.ic_widget_refresh_light,
    good = if (dark) 0xFF22C55E.toInt() else 0xFF147A39.toInt(),
    warning = if (dark) 0xFFF59E0B.toInt() else 0xFFA8510A.toInt(),
    critical = if (dark) 0xFFEF4444.toInt() else 0xFFC52222.toInt(),
    iconBorder = if (dark) 0xFF3C4A5A.toInt() else 0xFFD8E1EB.toInt(),
    sheenSoft = if (dark) R.drawable.widget_sheen_dark else R.drawable.widget_sheen_light,
    sheenBright =
      if (dark) R.drawable.widget_sheen_dark_bright else R.drawable.widget_sheen_light_bright,
  )
}

private val DECIMAL_UNITS = arrayOf("B", "KB", "MB", "GB", "TB")
private val BINARY_UNITS = arrayOf("B", "KiB", "MiB", "GiB", "TiB")

internal fun formatWidgetBytes(bytes: Long, binary: Boolean, decimals: Int = 0): String {
  val units = if (binary) BINARY_UNITS else DECIMAL_UNITS
  val base = if (binary) 1024.0 else 1000.0
  var value = bytes.coerceAtLeast(0L).toDouble()
  var unit = 0
  while (value >= base && unit < units.lastIndex) {
    value /= base
    unit += 1
  }
  return if (unit == 0) {
    "${value.roundToLong()} ${units[unit]}"
  } else {
    String.format(Locale.getDefault(), "%.${decimals}f %s", value, units[unit])
  }
}

internal fun formatWidgetBytesPair(usedBytes: Long, totalBytes: Long, binary: Boolean): String {
  val units = if (binary) BINARY_UNITS else DECIMAL_UNITS
  val base = if (binary) 1024.0 else 1000.0
  var unit = 0
  var total = totalBytes.coerceAtLeast(0L).toDouble()
  while (total >= base && unit < units.lastIndex) {
    total /= base
    unit += 1
  }
  if (unit < 2) unit = 2

  val factor = when (unit) {
    2 -> if (binary) 1024.0 * 1024.0 else 1000.0 * 1000.0
    3 -> if (binary) 1024.0 * 1024.0 * 1024.0 else 1000.0 * 1000.0 * 1000.0
    else -> if (binary) 1024.0 * 1024.0 * 1024.0 * 1024.0 else 1000.0 * 1000.0 * 1000.0 * 1000.0
  }

  val used = usedBytes.coerceAtLeast(0L) / factor
  val whole = totalBytes.coerceAtLeast(0L) / factor
  return String.format(Locale.getDefault(), "%.1f / %.1f %s", used, whole, units[unit])
}
