package expo.modules.toolsext

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The clock-app hand-offs behind the Tools hub.
 *
 * Android keeps alarms and timers inside the user's clock app — no API creates
 * them directly. These functions only prefill the standard AlarmClock intents
 * with real typed extras (the repeat days travel as the documented
 * `ArrayList<Integer>` of `Calendar` day codes, which a plain JS-launched
 * intent cannot carry) and hand the user to their clock app, which saves the
 * entry. Nothing is stored inside Device Matrix.
 */
class ToolsExtModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ToolsExt")

    Function("startAlarm") { hour: Int, minute: Int, message: String?, days: List<Int>? ->
      launch {
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
          putExtra(AlarmClock.EXTRA_HOUR, hour)
          putExtra(AlarmClock.EXTRA_MINUTES, minute)
          if (!message.isNullOrBlank()) {
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
          }
          if (!days.isNullOrEmpty()) {
            putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS, ArrayList(days))
          }
        }
        start(intent)
      }
    }

    Function("startTimer") { seconds: Int, message: String? ->
      launch {
        val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
          putExtra(AlarmClock.EXTRA_LENGTH, seconds)
          if (!message.isNullOrBlank()) {
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
          }
        }
        start(intent)
      }
    }
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
