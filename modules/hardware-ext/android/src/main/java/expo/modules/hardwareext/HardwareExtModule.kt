package expo.modules.hardwareext

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Rect
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.GLES20
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Display
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

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
      mapOf(
        "index" to cpu,
        "currentKhz" to readLong("/sys/devices/system/cpu/cpu$cpu/cpufreq/scaling_cur_freq"),
        "maxKhz" to readLong("/sys/devices/system/cpu/cpu$cpu/cpufreq/cpuinfo_max_freq")
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

    return mapOf(
      "renderer" to gl.first,
      "vendor" to gl.second,
      "glVersion" to gl.third,
      "glEsVersion" to glEsVersion,
      "vulkanVersion" to vulkanVersion(context)
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
      if (major == 0) null else "$major.$minor"
    } catch (_: Exception) {
      null
    }
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
      "brightness" to brightness,
      "brightnessMode" to brightnessMode,
      "screenTimeoutMs" to screenTimeoutMs
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

    val megapixels = try {
      val size: Rect? = characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
      if (size != null && size.width() > 0 && size.height() > 0) {
        size.width().toDouble() * size.height().toDouble() / 1_000_000.0
      } else {
        null
      }
    } catch (_: Exception) {
      null
    }

    val aperture = try {
      characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES)
        ?.firstOrNull()
        ?.toDouble()
    } catch (_: Exception) {
      null
    }

    val focalLength = try {
      characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
        ?.firstOrNull()
        ?.toDouble()
    } catch (_: Exception) {
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
      "aperture" to aperture,
      "focalLengthMm" to focalLength,
      "flash" to flash,
      "opticalStabilization" to opticalStabilization,
      "videoStabilization" to videoStabilization
    )
  }
}
