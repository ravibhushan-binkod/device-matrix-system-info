package expo.modules.homewidget

import java.time.DateTimeException
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeParseException
import kotlin.math.roundToInt

internal data class HealthResult(
  val score: Int?,
  val availableChecks: Int,
  val totalChecks: Int,
)

/**
 * Native mirror of `src/features/dashboard/services/health-score.ts`.
 *
 * The widget must be able to render the same score while the React Native
 * process is not running, so this deliberately duplicates the app's weights,
 * thresholds and unavailable-source rules rather than inventing a score.
 */
internal object HealthScore {
  private const val SECURITY_WEIGHT = 30
  private const val STORAGE_WEIGHT = 25
  private const val MEMORY_WEIGHT = 20
  private const val BATTERY_WEIGHT = 15
  private const val THERMAL_WEIGHT = 10
  private const val TOTAL_CHECKS = 5

  private data class Check(
    val weight: Int,
    val earned: Int,
    val available: Boolean,
  )

  fun compute(
    storageFreeRatio: Double?,
    memoryUsedRatio: Double?,
    batteryHealth: BatteryHealth?,
    batteryTemperatureC: Double?,
    thermalStatus: ThermalStatusName?,
    thermalHeadroom: Double?,
    now: Long,
  ): HealthResult {
    val checks = listOf(
      check(SECURITY_WEIGHT, securityPoints(now)),
      check(STORAGE_WEIGHT, storagePoints(storageFreeRatio)),
      check(MEMORY_WEIGHT, memoryPoints(memoryUsedRatio)),
      check(BATTERY_WEIGHT, batteryPoints(batteryHealth, batteryTemperatureC)),
      check(THERMAL_WEIGHT, thermalPoints(thermalStatus, thermalHeadroom)),
    )
    val available = checks.filter { it.available }
    val weight = available.sumOf { it.weight }
    val earned = available.sumOf { it.earned }
    val score = if (weight > 0) {
      ((earned.toDouble() / weight.toDouble()) * 100.0).roundToInt()
    } else {
      null
    }

    return HealthResult(
      score = score,
      availableChecks = available.size,
      totalChecks = TOTAL_CHECKS,
    )
  }

  private fun check(weight: Int, earned: Int?): Check {
    if (earned == null) return Check(weight = weight, earned = 0, available = false)
    return Check(
      weight = weight,
      earned = earned.coerceIn(0, weight),
      available = true,
    )
  }

  private fun securityPoints(now: Long): Int? {
    val patch = android.os.Build.VERSION.SECURITY_PATCH
      ?.trim()
      ?.takeIf { it.isNotEmpty() && !it.equals("unknown", ignoreCase = true) }
      ?: return null
    val age = securityPatchAgeDays(patch, now) ?: return null
    return when {
      age <= 90 -> SECURITY_WEIGHT
      age <= 200 -> 24
      age <= 365 -> 18
      age <= 550 -> 10
      else -> 4
    }
  }

  private fun securityPatchAgeDays(patch: String, now: Long): Long? {
    val match = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$").matchEntire(patch)
      ?: return null
    val date = try {
      LocalDate.of(
        match.groupValues[1].toInt(),
        match.groupValues[2].toInt(),
        match.groupValues[3].toInt(),
      )
    } catch (_: DateTimeParseException) {
      return null
    } catch (_: DateTimeException) {
      return null
    }
    val patchStart = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    return ((now - patchStart) / 86_400_000L).coerceAtLeast(0L)
  }

  private fun storagePoints(freeRatio: Double?): Int? {
    if (freeRatio == null || !freeRatio.isFinite()) return null
    val free = freeRatio.coerceIn(0.0, 1.0)
    return when {
      free >= 0.20 -> STORAGE_WEIGHT
      free >= 0.15 -> 22
      free >= 0.10 -> 16
      free >= 0.05 -> 9
      else -> 2
    }
  }

  private fun memoryPoints(usedRatio: Double?): Int? {
    if (usedRatio == null || !usedRatio.isFinite()) return null
    val used = usedRatio.coerceIn(0.0, 1.0)
    return when {
      used <= 0.65 -> MEMORY_WEIGHT
      used <= 0.75 -> 16
      used <= 0.85 -> 10
      used <= 0.92 -> 5
      else -> 0
    }
  }

  private fun batteryPoints(
    health: BatteryHealth?,
    temperatureC: Double?,
  ): Int? {
    val hasHealth = health != null && health != BatteryHealth.UNKNOWN
    val hasTemperature = temperatureC != null && temperatureC.isFinite()
    if (!hasHealth && !hasTemperature) return null

    if (health == BatteryHealth.OVERHEAT) return 0
    if (health == BatteryHealth.DEAD ||
      health == BatteryHealth.OVER_VOLTAGE ||
      health == BatteryHealth.FAILURE ||
      health == BatteryHealth.COLD
    ) {
      return 4
    }
    if (hasTemperature) {
      val temperature = temperatureC as Double
      if (temperature >= 45.0) return 5
      if (temperature >= 42.0) return 9
      if (temperature <= 0.0) return 6
      if (temperature <= 10.0) return 10
    }
    if (health == BatteryHealth.GOOD) return BATTERY_WEIGHT
    if (health == BatteryHealth.UNKNOWN) return 11
    return 9
  }

  private fun thermalPoints(
    status: ThermalStatusName?,
    headroom: Double?,
  ): Int? {
    val fromStatus = when (status) {
      ThermalStatusName.NONE -> 10
      ThermalStatusName.LIGHT -> 9
      ThermalStatusName.MODERATE -> 6
      ThermalStatusName.SEVERE -> 3
      ThermalStatusName.CRITICAL -> 1
      ThermalStatusName.EMERGENCY, ThermalStatusName.SHUTDOWN -> 0
      null -> null
    }
    if (fromStatus != null) return fromStatus
    if (headroom == null || !headroom.isFinite()) return null
    val value = headroom.coerceIn(0.0, 1.0)
    return when {
      value >= 0.5 -> 10
      value >= 0.3 -> 8
      value >= 0.15 -> 5
      value >= 0.05 -> 3
      else -> 1
    }
  }
}
