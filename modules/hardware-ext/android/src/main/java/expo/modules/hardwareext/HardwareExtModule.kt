package expo.modules.hardwareext

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Rect
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaRecorder
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.GLES20
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.Log
import android.view.Display
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.PI
import kotlin.math.sin

/**
 * Hardware readings that Build, Expo packages and react-native-device-info
 * do not expose: per-core CPU frequency, the GL/Vulkan identity, display
 * capabilities and the camera2 descriptors. Public Android APIs only.
 */
class HardwareExtModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HardwareExt")

    Function("getCpuInfo") {
      cpuInfo()
    }

    Function("getGpuInfo") {
      gpuInfo()
    }

    Function("getDisplayInfo") {
      displayInfo()
    }

    Function("getCameraInfo") {
      cameraInfo()
    }

    Function("getTorchInfo") {
      torchInfo()
    }

    Function("setTorch") { enabled: Boolean ->
      setTorch(enabled)
    }

    Function("getVibrationInfo") {
      vibrationInfo()
    }

    Function("getAudioOutput") {
      audioOutput()
    }

    Function("startTone") { route: String, channel: String, durationMs: Int ->
      startTone(route, channel, durationMs)
    }

    Function("stopTone") {
      stopToneInternal()
      true
    }

    OnDestroy {
      unregisterTorchCallback()
      stopToneInternal()
    }
  }

  private var torchCallback: CameraManager.TorchCallback? = null
  private var torchCameraId: String? = null

  /** Last state the system reported through the torch callback; `null` while unknown. */
  private var torchEnabled: Boolean? = null

  /** The first camera with a flash — the one the torch toggle drives. */
  private fun flashCameraId(manager: CameraManager): String? = try {
    manager.cameraIdList.firstOrNull { id ->
      manager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
    }
  } catch (_: Exception) {
    null
  }

  /**
   * Torch state and availability. No camera permission is needed for the torch;
   * the state comes from a TorchCallback (which fires once right after it is
   * registered) so the app never shows a guessed value.
   */
  private fun torchInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
      ?: return null
    val cameraId = flashCameraId(manager)
    if (cameraId == null) {
      return mapOf("available" to false, "enabled" to null)
    }
    ensureTorchCallback(manager, cameraId)
    return mapOf("available" to true, "enabled" to torchEnabled)
  }

  private fun ensureTorchCallback(manager: CameraManager, cameraId: String) {
    if (torchCallback != null) return
    torchCameraId = cameraId
    val callback = object : CameraManager.TorchCallback() {
      override fun onTorchModeChanged(changedId: String, enabled: Boolean) {
        if (changedId == torchCameraId) {
          torchEnabled = enabled
        }
      }

      override fun onTorchModeUnavailable(changedId: String) {
        if (changedId == torchCameraId) {
          torchEnabled = null
        }
      }
    }
    try {
      manager.registerTorchCallback(callback, Handler(Looper.getMainLooper()))
      torchCallback = callback
    } catch (_: Exception) {
      torchCameraId = null
    }
  }

  private fun unregisterTorchCallback() {
    val callback = torchCallback ?: return
    torchCallback = null
    val context = appContext.reactContext ?: return
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return
    try {
      manager.unregisterTorchCallback(callback)
    } catch (_: Exception) {
      // The module is going away; Android drops the callback with it.
    }
  }

  /** Switches the torch; the wrapper turns a failure into an honest "not available". */
  private fun setTorch(enabled: Boolean): Map<String, Any?> {
    val context = appContext.reactContext
      ?: return mapOf("ok" to false, "reason" to "failed")
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
      ?: return mapOf("ok" to false, "reason" to "failed")
    val cameraId = torchCameraId ?: flashCameraId(manager)
      ?: return mapOf("ok" to false, "reason" to "unavailable")
    ensureTorchCallback(manager, cameraId)
    return try {
      manager.setTorchMode(cameraId, enabled)
      mapOf("ok" to true, "reason" to null)
    } catch (_: SecurityException) {
      mapOf("ok" to false, "reason" to "blocked")
    } catch (_: Exception) {
      mapOf("ok" to false, "reason" to "failed")
    }
  }

  @Suppress("DEPRECATION")
  private fun vibrationInfo(): Map<String, Any?> {
    val context = appContext.reactContext ?: return mapOf("hasVibrator" to false)
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)
        ?.defaultVibrator
    } else {
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    val hasVibrator = try {
      vibrator?.hasVibrator() ?: false
    } catch (_: Exception) {
      false
    }
    return mapOf("hasVibrator" to hasVibrator)
  }

  /* ------------------------------------------------------------------ audio */

  private var toneTrack: AudioTrack? = null
  private var toneHandler: Handler? = null
  private var savedAudioMode: Int? = null
  private var savedSpeakerphone: Boolean? = null

  /**
   * Plays a 440 Hz stereo tone for the requested duration, then stops. The
   * left/right balance is done by zeroing one channel, so no audio permission
   * is needed. The earpiece route uses Android's communication mode (the
   * normal MODIFY_AUDIO_SETTINGS permission) and restores the previous mode
   * and speakerphone state when the test ends.
   */
  private fun startTone(route: String, channel: String, durationMs: Int): Map<String, Any?> {
    stopToneInternal()
    val context = appContext.reactContext ?: return toneFailure("failed")
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      ?: return toneFailure("failed")
    val earpiece = route == "earpiece"
    val hasEarpiece = audioHasType(audio, AudioDeviceInfo.TYPE_BUILTIN_EARPIECE)
    if (earpiece && !hasEarpiece) return toneFailure("no-earpiece")

    val frames = (TONE_SAMPLE_RATE * (durationMs.coerceIn(1_000, 15_000) / 1_000.0)).toInt()
    val samples = ShortArray(frames * 2)
    val amplitude = (Short.MAX_VALUE * 0.22).toInt()
    val step = 2.0 * PI * 440.0 / TONE_SAMPLE_RATE
    for (index in 0 until frames) {
      val sample = (sin(step * index) * amplitude).toInt().toShort()
      when (channel) {
        "left" -> {
          samples[index * 2] = sample
          samples[index * 2 + 1] = 0
        }
        "right" -> {
          samples[index * 2] = 0
          samples[index * 2 + 1] = sample
        }
        else -> {
          samples[index * 2] = sample
          samples[index * 2 + 1] = sample
        }
      }
    }

    val attributes = AudioAttributes.Builder()
      .setUsage(
        if (earpiece) AudioAttributes.USAGE_VOICE_COMMUNICATION else AudioAttributes.USAGE_MEDIA
      )
      .setContentType(
        if (earpiece) AudioAttributes.CONTENT_TYPE_SPEECH else AudioAttributes.CONTENT_TYPE_MUSIC
      )
      .build()
    val format = AudioFormat.Builder()
      .setSampleRate(TONE_SAMPLE_RATE)
      .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
      .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
      .build()

    return try {
      if (earpiece) {
        savedAudioMode = audio.mode
        @Suppress("DEPRECATION")
        savedSpeakerphone = audio.isSpeakerphoneOn
        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        @Suppress("DEPRECATION")
        audio.isSpeakerphoneOn = false
      }

      val track = AudioTrack.Builder()
        .setAudioAttributes(attributes)
        .setAudioFormat(format)
        .setTransferMode(AudioTrack.MODE_STATIC)
        .setBufferSizeInBytes(samples.size * 2)
        .build()

      if (
        track.state != AudioTrack.STATE_INITIALIZED &&
        track.state != AudioTrack.STATE_NO_STATIC_DATA
      ) {
        track.release()
        restoreAudio(audio)
        return toneFailure("failed")
      }

      val wantedType = if (earpiece) {
        AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
      } else {
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
      }
      try {
        audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
          .firstOrNull { it.type == wantedType }
          ?.let { track.preferredDevice = it }
      } catch (_: Exception) {
        // Keep Android's default route; the screen still reports what it sees.
      }

      val written = track.write(samples, 0, samples.size)
      if (written != samples.size) {
        track.release()
        restoreAudio(audio)
        return toneFailure("failed")
      }
      track.play()
      toneTrack = track

      val handler = Handler(Looper.getMainLooper())
      toneHandler = handler
      handler.postDelayed(
        { stopToneInternal() },
        durationMs.coerceIn(1_000, 15_000).toLong()
      )

      mapOf(
        "ok" to true,
        "reason" to null,
        "output" to audioOutputRoute(audio),
        "earpieceAvailable" to hasEarpiece
      )
    } catch (_: SecurityException) {
      stopToneInternal()
      toneFailure("blocked")
    } catch (error: Exception) {
      Log.w("HardwareExt", "startTone failed", error)
      stopToneInternal()
      toneFailure("failed")
    }
  }

  private fun toneFailure(reason: String): Map<String, Any?> = mapOf(
    "ok" to false,
    "reason" to reason,
    "output" to null,
    "earpieceAvailable" to false
  )

  private fun stopToneInternal() {
    toneHandler?.removeCallbacksAndMessages(null)
    toneHandler = null
    val track = toneTrack
    toneTrack = null
    if (track != null) {
      try {
        if (track.playState == AudioTrack.PLAYSTATE_PLAYING) track.stop()
      } catch (_: Exception) {
        // Already stopped.
      }
      try {
        track.release()
      } catch (_: Exception) {
        // Already released.
      }
    }
    val context = appContext.reactContext ?: return
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    restoreAudio(audio)
  }

  private fun restoreAudio(audio: AudioManager) {
    val mode = savedAudioMode
    val speaker = savedSpeakerphone
    savedAudioMode = null
    savedSpeakerphone = null
    try {
      if (mode != null) audio.mode = mode
    } catch (_: Exception) {
      // The app may be leaving; Android restores audio focus itself.
    }
    try {
      @Suppress("DEPRECATION")
      if (speaker != null) audio.isSpeakerphoneOn = speaker
    } catch (_: Exception) {
      // Same as above.
    }
  }

  private fun audioOutput(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return null
    return try {
      val devices = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      mapOf(
        "route" to audioOutputRoute(audio),
        "headsetConnected" to devices.any {
          it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
        },
        "usbAudioConnected" to devices.any {
          it.type == AudioDeviceInfo.TYPE_USB_HEADSET ||
            it.type == AudioDeviceInfo.TYPE_USB_DEVICE ||
            it.type == AudioDeviceInfo.TYPE_USB_ACCESSORY
        },
        "earpieceAvailable" to devices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE },
        "devices" to devices.map { audioDeviceLabel(it.type) }.distinct()
      )
    } catch (_: Exception) {
      mapOf(
        "route" to "unknown",
        "headsetConnected" to false,
        "usbAudioConnected" to false,
        "earpieceAvailable" to false,
        "devices" to emptyList<String>()
      )
    }
  }

  private fun audioHasType(audio: AudioManager, type: Int): Boolean = try {
    audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any { it.type == type }
  } catch (_: Exception) {
    false
  }

  private fun audioOutputRoute(audio: AudioManager): String = try {
    val types = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { it.type }
    when {
      types.any {
        it == AudioDeviceInfo.TYPE_WIRED_HEADSET || it == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
      } -> "wired-headset"
      types.any {
        it == AudioDeviceInfo.TYPE_USB_HEADSET ||
          it == AudioDeviceInfo.TYPE_USB_DEVICE ||
          it == AudioDeviceInfo.TYPE_USB_ACCESSORY
      } -> "usb-audio"
      types.any {
        it == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
          it == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
          (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && (
            it == AudioDeviceInfo.TYPE_BLE_HEADSET || it == AudioDeviceInfo.TYPE_BLE_SPEAKER
            ))
      } -> "bluetooth"
      types.contains(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) -> "earpiece"
      else -> "speaker"
    }
  } catch (_: Exception) {
    "unknown"
  }

  private fun audioDeviceLabel(type: Int): String = when (type) {
    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
    AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "earpiece"
    AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired-headset"
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired-headphones"
    AudioDeviceInfo.TYPE_USB_HEADSET -> "usb-headset"
    AudioDeviceInfo.TYPE_USB_DEVICE -> "usb-device"
    AudioDeviceInfo.TYPE_USB_ACCESSORY -> "usb-accessory"
    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetooth-a2dp"
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth-sco"
    AudioDeviceInfo.TYPE_BLE_HEADSET -> "ble-headset"
    AudioDeviceInfo.TYPE_BLE_SPEAKER -> "ble-speaker"
    else -> "other"
  }

  private companion object {
    const val TONE_SAMPLE_RATE = 44_100
  }

  private fun cpuInfo(): Map<String, Any?> {
    // Prefer the sysfs core list; availableProcessors can be limited by the app's cpuset.
    val cpuNumbers = try {
      File("/sys/devices/system/cpu")
        .listFiles { file -> file.name.matches(Regex("cpu[0-9]+")) }
        ?.mapNotNull { it.name.removePrefix("cpu").toIntOrNull() }
        ?.sorted()
        ?.takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }

    val cores = cpuNumbers?.size ?: Runtime.getRuntime().availableProcessors()
    val frequencies = (cpuNumbers ?: (0 until cores)).map { cpu ->
      val base = "/sys/devices/system/cpu/cpu$cpu/cpufreq"
      mapOf(
        "index" to cpu,
        "currentKhz" to readFrequencyKhz("$base/scaling_cur_freq"),
        "minKhz" to (readFrequencyKhz("$base/cpuinfo_min_freq")
          ?: readFrequencyKhz("$base/scaling_min_freq")),
        "maxKhz" to readFrequencyKhz("$base/cpuinfo_max_freq"),
        "governor" to readText("$base/scaling_governor")
      )
    }

    val socModel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      Build.SOC_MODEL.takeIf { it.isNotBlank() && it != Build.UNKNOWN }
    } else {
      null
    }
    val socManufacturer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      Build.SOC_MANUFACTURER.takeIf { it.isNotBlank() && it != Build.UNKNOWN }
    } else {
      null
    }

    return mapOf(
      "cores" to cores,
      "abis" to (Build.SUPPORTED_ABIS?.toList() ?: emptyList<String>()),
      "socModel" to socModel,
      "socManufacturer" to socManufacturer,
      "hardware" to Build.HARDWARE,
      "frequencies" to frequencies
    )
  }

  /** Some devices restrict cpufreq sysfs reads; those entries stay null. */
  private fun readLong(path: String): Long? = try {
    File(path).readText().trim().toLongOrNull()
  } catch (_: Exception) {
    null
  }

  /**
   * cpufreq files report kHz. A few kernels (the emulator does this) write
   * placeholder values like 1 or 2, so anything outside 100 MHz – 10 GHz is
   * treated as "not reported" instead of being shown as a nonsensical speed.
   */
  private fun readFrequencyKhz(path: String): Long? =
    readLong(path)?.takeIf { it in 100_000..10_000_000 }

  /** Same idea for cpufreq strings (the governor name); blocked reads stay null. */
  private fun readText(path: String): String? = try {
    File(path).readText().trim().takeIf { it.isNotEmpty() }
  } catch (_: Exception) {
    null
  }

  private fun gpuInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null

    val gl = readGlStrings()
    val glEsVersion = try {
      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val requested = activityManager?.deviceConfigurationInfo?.reqGlEsVersion ?: 0
      if (requested == 0) null else "${requested shr 16}.${requested and 0xFFFF}"
    } catch (_: Exception) {
      null
    }

    val vulkanVersion = vulkanVersion(context)
    return mapOf(
      "renderer" to gl.first,
      "vendor" to gl.second,
      "glVersion" to gl.third,
      "glEsVersion" to glEsVersion,
      "vulkanVersion" to vulkanVersion,
      "vulkanLevel" to (if (vulkanVersion == null) null else vulkanFeatureVersion(context, "android.hardware.vulkan.level")),
      "vulkanCompute" to (if (vulkanVersion == null) null else hasFeature(context, PackageManager.FEATURE_VULKAN_HARDWARE_COMPUTE))
    )
  }

  /** Reads GL_VENDOR / GL_RENDERER / GL_VERSION from a temporary 1×1 EGL context. */
  private fun readGlStrings(): Triple<String?, String?, String?> {
    val display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
    if (display == EGL14.EGL_NO_DISPLAY) return Triple(null, null, null)

    var renderer: String? = null
    var vendor: String? = null
    var glVersion: String? = null

    try {
      val version = IntArray(2)
      if (!EGL14.eglInitialize(display, version, 0, version, 1)) {
        return Triple(null, null, null)
      }

      val configAttribs = intArrayOf(
        EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
        EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
        EGL14.EGL_RED_SIZE, 8,
        EGL14.EGL_GREEN_SIZE, 8,
        EGL14.EGL_BLUE_SIZE, 8,
        EGL14.EGL_NONE
      )
      val configs = arrayOfNulls<EGLConfig>(1)
      val numConfigs = IntArray(1)
      if (!EGL14.eglChooseConfig(display, configAttribs, 0, configs, 0, 1, numConfigs, 0) ||
        numConfigs[0] <= 0
      ) {
        return Triple(null, null, null)
      }
      val config = configs[0] ?: return Triple(null, null, null)

      val surfaceAttribs = intArrayOf(
        EGL14.EGL_WIDTH, 1,
        EGL14.EGL_HEIGHT, 1,
        EGL14.EGL_NONE
      )
      val surface = EGL14.eglCreatePbufferSurface(display, config, surfaceAttribs, 0)
      if (surface == EGL14.EGL_NO_SURFACE) return Triple(null, null, null)

      try {
        val contextAttribs = intArrayOf(
          EGL14.EGL_CONTEXT_CLIENT_VERSION, 2,
          EGL14.EGL_NONE
        )
        val glContext = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT, contextAttribs, 0)
        if (glContext == EGL14.EGL_NO_CONTEXT) return Triple(null, null, null)

        try {
          if (EGL14.eglMakeCurrent(display, surface, surface, glContext)) {
            renderer = GLES20.glGetString(GLES20.GL_RENDERER)
            vendor = GLES20.glGetString(GLES20.GL_VENDOR)
            glVersion = GLES20.glGetString(GLES20.GL_VERSION)
            EGL14.eglMakeCurrent(
              display,
              EGL14.EGL_NO_SURFACE,
              EGL14.EGL_NO_SURFACE,
              EGL14.EGL_NO_CONTEXT
            )
          }
        } finally {
          EGL14.eglDestroyContext(display, glContext)
        }
      } finally {
        EGL14.eglDestroySurface(display, surface)
      }
    } catch (_: Exception) {
      // Leave the nulls; the wrapper reports the values as unavailable.
    } finally {
      EGL14.eglTerminate(display)
    }

    return Triple(renderer, vendor, glVersion)
  }

  /** Vulkan API version from the system feature, e.g. "1.3" or "1.3.1". */
  private fun vulkanVersion(context: Context): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return null
    return try {
      val feature = context.packageManager.systemAvailableFeatures
        ?.firstOrNull { it.name == PackageManager.FEATURE_VULKAN_HARDWARE_VERSION }
        ?: return null
      val version = feature.version
      if (version <= 0) return null
      val major = version ushr 22
      val minor = (version ushr 12) and 0x3FF
      val patch = version and 0xFFF
      if (major == 0) null else if (patch > 0) "$major.$minor.$patch" else "$major.$minor"
    } catch (_: Exception) {
      null
    }
  }

  /** Version integer of a system feature (e.g. the Vulkan hardware level). */
  private fun vulkanFeatureVersion(context: Context, featureName: String): Int? = try {
    val feature = context.packageManager.systemAvailableFeatures
      ?.firstOrNull { it.name == featureName }
    feature?.version?.takeIf { it > 0 }
  } catch (_: Exception) {
    null
  }

  private fun hasFeature(context: Context, featureName: String): Boolean? = try {
    context.packageManager.hasSystemFeature(featureName)
  } catch (_: Exception) {
    null
  }

  @Suppress("DEPRECATION")
  private fun displayInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
      ?: return null

    var widthPx: Int? = null
    var heightPx: Int? = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val bounds = windowManager.maximumWindowMetrics.bounds
        widthPx = bounds.width()
        heightPx = bounds.height()
      } catch (_: Exception) {
        // Fall through to the real display metrics below.
      }
    }
    val display = try {
      windowManager.defaultDisplay
    } catch (_: Exception) {
      null
    }
    if ((widthPx == null || heightPx == null) && display != null) {
      try {
        val realMetrics = DisplayMetrics()
        display.getRealMetrics(realMetrics)
        widthPx = realMetrics.widthPixels
        heightPx = realMetrics.heightPixels
      } catch (_: Exception) {
        // Leave the nulls.
      }
    }

    val displayMetrics = context.resources.displayMetrics

    val refreshRate = try {
      display?.refreshRate?.toDouble()
    } catch (_: Exception) {
      null
    }

    val modes = if (display == null) {
      emptyList()
    } else {
      try {
        display.supportedModes.map { mode ->
          mapOf(
            "widthPx" to mode.physicalWidth,
            "heightPx" to mode.physicalHeight,
            "refreshRateHz" to mode.refreshRate.toDouble()
          )
        }
      } catch (_: Exception) {
        emptyList()
      }
    }

    val isHdr = if (display != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      try {
        display.isHdr
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    val hdrTypes = if (display != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      try {
        display.hdrCapabilities?.supportedHdrTypes?.map { hdrTypeName(it) } ?: emptyList()
      } catch (_: Exception) {
        emptyList()
      }
    } else {
      emptyList()
    }

    val resolver = context.contentResolver
    val brightness = try {
      val value = Settings.System.getInt(resolver, Settings.System.SCREEN_BRIGHTNESS, -1)
      if (value in 0..255) value else null
    } catch (_: Exception) {
      null
    }

    val brightnessMode = try {
      when (Settings.System.getInt(resolver, Settings.System.SCREEN_BRIGHTNESS_MODE, -1)) {
        Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC -> "auto"
        Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL -> "manual"
        else -> null
      }
    } catch (_: Exception) {
      null
    }

    val screenTimeoutMs = try {
      val value = Settings.System.getInt(resolver, Settings.System.SCREEN_OFF_TIMEOUT, -1)
      if (value > 0) value else null
    } catch (_: Exception) {
      null
    }

    val isWideColorGamut = if (display != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        display.isWideColorGamut
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    return mapOf(
      "widthPx" to widthPx,
      "heightPx" to heightPx,
      "densityDpi" to displayMetrics.densityDpi,
      "density" to displayMetrics.density.toDouble(),
      "xdpi" to displayMetrics.xdpi.toDouble(),
      "ydpi" to displayMetrics.ydpi.toDouble(),
      "refreshRateHz" to refreshRate,
      "supportedModes" to modes,
      "isHdr" to isHdr,
      "hdrTypes" to hdrTypes,
      "isWideColorGamut" to isWideColorGamut,
      "cutout" to cutoutInfo(context, windowManager, display),
      "brightness" to brightness,
      "brightnessMode" to brightnessMode,
      "screenTimeoutMs" to screenTimeoutMs
    )
  }

  /**
   * Display cutout presence and safe insets. `WindowManager.maximumWindowMetrics`
   * (Android 11+) is preferred; `Display.getCutout()` (Android 10) is the fallback.
   * `null` means the value is not available on this Android version or blocked.
   */
  private fun cutoutInfo(
    context: Context,
    windowManager: WindowManager,
    display: Display?
  ): Map<String, Any?>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
    val cutout = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        windowManager.maximumWindowMetrics.windowInsets.displayCutout
      } else {
        display?.cutout
      }
    } catch (_: Exception) {
      null
    }

    if (cutout == null) {
      // No insets source on this Android version — an honest "not readable".
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        mapOf(
          "hasCutout" to false,
          "safeInsetTopPx" to 0,
          "safeInsetBottomPx" to 0,
          "safeInsetLeftPx" to 0,
          "safeInsetRightPx" to 0
        )
      } else {
        null
      }
    }

    return mapOf(
      "hasCutout" to (cutout.boundingRects.isNotEmpty() || cutout.safeInsetTop > 0 ||
        cutout.safeInsetBottom > 0 || cutout.safeInsetLeft > 0 || cutout.safeInsetRight > 0),
      "safeInsetTopPx" to cutout.safeInsetTop,
      "safeInsetBottomPx" to cutout.safeInsetBottom,
      "safeInsetLeftPx" to cutout.safeInsetLeft,
      "safeInsetRightPx" to cutout.safeInsetRight
    )
  }

  private fun hdrTypeName(type: Int): String = when (type) {
    Display.HdrCapabilities.HDR_TYPE_DOLBY_VISION -> "Dolby Vision"
    Display.HdrCapabilities.HDR_TYPE_HDR10 -> "HDR10"
    Display.HdrCapabilities.HDR_TYPE_HLG -> "HLG"
    Display.HdrCapabilities.HDR_TYPE_HDR10_PLUS -> "HDR10+"
    else -> "Unknown"
  }

  /** Camera descriptors from camera2 characteristics — no camera permission is needed. */
  private fun cameraInfo(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
      ?: return null

    val cameras = try {
      manager.cameraIdList.mapNotNull { id -> cameraDescriptor(manager, id) }
    } catch (_: Exception) {
      return null
    }

    return mapOf("cameras" to cameras)
  }

  private fun cameraDescriptor(manager: CameraManager, id: String): Map<String, Any?>? {
    val characteristics = try {
      manager.getCameraCharacteristics(id)
    } catch (_: Exception) {
      null
    } ?: return null

    val facing = when (characteristics.get(CameraCharacteristics.LENS_FACING)) {
      CameraCharacteristics.LENS_FACING_FRONT -> "front"
      CameraCharacteristics.LENS_FACING_BACK -> "back"
      CameraCharacteristics.LENS_FACING_EXTERNAL -> "external"
      else -> "unknown"
    }

    val activeArray: Rect? = try {
      characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
    } catch (_: Exception) {
      null
    }

    val megapixels = try {
      if (activeArray != null && activeArray.width() > 0 && activeArray.height() > 0) {
        activeArray.width().toDouble() * activeArray.height().toDouble() / 1_000_000.0
      } else {
        null
      }
    } catch (_: Exception) {
      null
    }

    val physicalSize = try {
      characteristics.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
    } catch (_: Exception) {
      null
    }

    val apertures = try {
      characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES)?.map { it.toDouble() }
    } catch (_: Exception) {
      null
    }

    val focalLengths = try {
      characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
        ?.map { it.toDouble() }
    } catch (_: Exception) {
      null
    }

    val isoRange = try {
      characteristics.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
    } catch (_: Exception) {
      null
    }

    val exposureRange = try {
      characteristics.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
    } catch (_: Exception) {
      null
    }

    val minFocusDistance = try {
      characteristics.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)?.toDouble()
    } catch (_: Exception) {
      null
    }

    val maxDigitalZoom = try {
      characteristics.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM)?.toDouble()
    } catch (_: Exception) {
      null
    }

    val rawSupport = try {
      characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
        ?.contains(CameraMetadata.REQUEST_AVAILABLE_CAPABILITIES_RAW)
    } catch (_: Exception) {
      null
    }

    val videoSizes = try {
      val streamMap = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      streamMap?.getOutputSizes(MediaRecorder::class.java)?.map { size ->
        mapOf("widthPx" to size.width, "heightPx" to size.height)
      }
    } catch (_: Exception) {
      null
    }

    val fpsRanges = try {
      characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)?.map { range ->
        mapOf("minFps" to range.lower, "maxFps" to range.upper)
      }
    } catch (_: Exception) {
      null
    }

    val hardwareLevel = try {
      when (characteristics.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)) {
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY -> "legacy"
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED -> "limited"
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_FULL -> "full"
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_3 -> "level3"
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL -> "external"
        else -> null
      }
    } catch (_: Exception) {
      null
    }

    val physicalCameraIds = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      try {
        characteristics.physicalCameraIds.toList()
      } catch (_: Exception) {
        null
      }
    } else {
      null
    }

    val flash = try {
      characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
    } catch (_: Exception) {
      false
    }

    val opticalStabilization = try {
      if (characteristics.getKeys().contains(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION)) {
        characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION)
          ?.contains(CameraCharacteristics.LENS_OPTICAL_STABILIZATION_MODE_ON) ?: false
      } else {
        null
      }
    } catch (_: Exception) {
      null
    }

    val videoStabilization = try {
      if (characteristics.getKeys().contains(CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES)) {
        characteristics.get(CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES)
          ?.contains(CameraCharacteristics.CONTROL_VIDEO_STABILIZATION_MODE_ON) ?: false
      } else {
        null
      }
    } catch (_: Exception) {
      null
    }

    return mapOf(
      "id" to id,
      "facing" to facing,
      "megapixels" to megapixels,
      "sensorWidthPx" to activeArray?.width(),
      "sensorHeightPx" to activeArray?.height(),
      "sensorPhysicalWidthMm" to physicalSize?.width?.toDouble(),
      "sensorPhysicalHeightMm" to physicalSize?.height?.toDouble(),
      "aperture" to apertures?.firstOrNull(),
      "apertures" to apertures,
      "focalLengthMm" to focalLengths?.firstOrNull(),
      "focalLengthsMm" to focalLengths,
      "isoMin" to isoRange?.lower,
      "isoMax" to isoRange?.upper,
      "exposureMinNs" to exposureRange?.lower?.toDouble(),
      "exposureMaxNs" to exposureRange?.upper?.toDouble(),
      "minFocusDistance" to minFocusDistance,
      "maxDigitalZoom" to maxDigitalZoom,
      "rawSupport" to rawSupport,
      "videoSizes" to videoSizes,
      "fpsRanges" to fpsRanges,
      "hardwareLevel" to hardwareLevel,
      "physicalCameraIds" to physicalCameraIds,
      "flash" to flash,
      "opticalStabilization" to opticalStabilization,
      "videoStabilization" to videoStabilization
    )
  }
}
