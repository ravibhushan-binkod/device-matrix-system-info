package expo.modules.homewidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * Lightweight, native configuration screen launched by the launcher for one
 * widget ID. It reads and writes only that widget's appearance; global app
 * settings and other widget instances are never touched.
 */
class WidgetConfigActivity : Activity() {
  private var widgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID
  private var type: WidgetType = WidgetType.RAM_COMPACT
  private var theme: WidgetTheme = WidgetTheme.SYSTEM
  private var accent: WidgetAccent = WidgetAccent.CYAN
  private var accentLight: Int? = null
  private var accentDark: Int? = null
  private var transparency: WidgetTransparency = WidgetTransparency.SOLID
  private var motion: Boolean = true

  private lateinit var previewHost: FrameLayout
  private lateinit var saveButton: Button
  private lateinit var motionCheck: CheckBox
  private lateinit var kindLabel: TextView
  private val themeRadios = mutableListOf<RadioButton>()
  private val transparencyRadios = mutableListOf<RadioButton>()
  private val swatches = mutableMapOf<WidgetAccent, View>()

  private val bgColor = Color.parseColor("#0B0F14")
  private val textColor = Color.parseColor("#E8EEF5")
  private val mutedColor = Color.parseColor("#8A98A8")

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)

    widgetId = intent.getIntExtra(
      AppWidgetManager.EXTRA_APPWIDGET_ID,
      AppWidgetManager.INVALID_APPWIDGET_ID,
    )
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      Toast.makeText(this, R.string.widget_config_no_widget, Toast.LENGTH_LONG).show()
      finish()
      return
    }

    val manager = AppWidgetManager.getInstance(this)
    val providerClass = manager.getAppWidgetInfo(widgetId)?.provider?.className
    val resolved = WidgetType.fromProvider(providerClass)
    if (resolved == null) {
      Toast.makeText(this, R.string.widget_config_no_widget, Toast.LENGTH_LONG).show()
      finish()
      return
    }
    type = resolved

    val saved = WidgetPrefs.appearance(this, widgetId)
    theme = saved.theme
    accent = saved.accent
    accentLight = saved.accentLight
    accentDark = saved.accentDark
    transparency = saved.transparency
    motion = saved.motion

    window.setBackgroundDrawable(ColorDrawable(bgColor))
    @Suppress("DEPRECATION")
    window.statusBarColor = bgColor
    @Suppress("DEPRECATION")
    window.navigationBarColor = bgColor

    setContentView(buildScreen())
    updateAccentUi()
    updatePreview()
  }

  private fun buildScreen(): View {
    val scroll = ScrollView(this).apply {
      setBackgroundColor(bgColor)
      isFillViewport = true
      fitsSystemWindows = true
    }
    val content = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(24), dp(24), dp(24), dp(28))
    }
    scroll.addView(
      content,
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ),
    )

    kindLabel = label(
      text = getString(R.string.widget_config_kind, getString(type.labelRes)),
      color = accent.darkColor,
      sizeSp = 13f,
      medium = true,
    )
    content.addView(kindLabel)
    content.addView(
      label(
        text = getString(R.string.widget_config_title),
        color = textColor,
        sizeSp = 26f,
        medium = true,
        topDp = 4,
      ),
    )
    content.addView(
      label(
        text = getString(R.string.widget_config_subtitle),
        color = mutedColor,
        sizeSp = 13f,
        topDp = 4,
        bottomDp = 8,
      ),
    )

    content.addView(section(getString(R.string.widget_config_theme)))
    val themeGroup = RadioGroup(this).apply {
      orientation = RadioGroup.VERTICAL
    }
    val themeIds = mapOf(
      WidgetTheme.SYSTEM to View.generateViewId(),
      WidgetTheme.LIGHT to View.generateViewId(),
      WidgetTheme.DARK to View.generateViewId(),
    )
    themeIds.forEach { (value, id) ->
      val radio = RadioButton(this).apply {
        this.id = id
        text = getString(
          when (value) {
            WidgetTheme.SYSTEM -> R.string.widget_config_theme_system
            WidgetTheme.LIGHT -> R.string.widget_config_theme_light
            WidgetTheme.DARK -> R.string.widget_config_theme_dark
          },
        )
        textSize = 16f
        setTextColor(textColor)
        isChecked = theme == value
        minHeight = dp(48)
        setPadding(0, dp(6), 0, dp(6))
        setOnClickListener {
          theme = value
          updatePreview()
        }
      }
      themeRadios.add(radio)
      themeGroup.addView(
        radio,
        LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ),
      )
    }
    content.addView(themeGroup)

    content.addView(section(getString(R.string.widget_config_accent)))
    var row: LinearLayout? = null
    WidgetAccent.values().forEachIndexed { index, value ->
      if (index % 4 == 0) {
        row = LinearLayout(this).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.START
          setPadding(0, dp(2), 0, dp(2))
        }
        content.addView(
          row,
          LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
          ),
        )
      }
      val swatch = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(dp(48), dp(48)).apply {
          marginEnd = dp(8)
        }
        isClickable = true
        isFocusable = true
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
        setOnClickListener {
          accent = value
          accentLight = null
          accentDark = null
          updateAccentUi()
          updatePreview()
        }
      }
      swatches[value] = swatch
      row?.addView(swatch)
    }

    content.addView(section(getString(R.string.widget_config_background)))
    content.addView(
      label(
        text = getString(R.string.widget_config_transparency),
        color = mutedColor,
        sizeSp = 12f,
        medium = true,
        topDp = 4,
        bottomDp = 2,
      ),
    )
    val transparencyGroup = RadioGroup(this).apply {
      orientation = RadioGroup.HORIZONTAL
    }
    WidgetTransparency.values().forEach { value ->
      val id = View.generateViewId()
      val radio = RadioButton(this).apply {
        this.id = id
        text = getString(value.labelRes)
        textSize = 14f
        setTextColor(textColor)
        isChecked = transparency == value
        minHeight = dp(48)
        gravity = Gravity.CENTER
        setOnClickListener {
          transparency = value
          updatePreview()
        }
      }
      transparencyRadios.add(radio)
      transparencyGroup.addView(
        radio,
        LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f),
      )
    }
    content.addView(transparencyGroup)
    content.addView(
      label(
        text = getString(R.string.widget_config_transparency_note),
        color = mutedColor,
        sizeSp = 11f,
        bottomDp = 6,
      ),
    )

    motionCheck = CheckBox(this).apply {
      text = getString(R.string.widget_config_motion)
      textSize = 16f
      setTextColor(textColor)
      isChecked = motion
      minHeight = dp(48)
      setPadding(0, dp(4), 0, dp(4))
      setOnCheckedChangeListener { _, checked ->
        motion = checked
        updatePreview()
      }
    }
    content.addView(motionCheck)
    content.addView(
      label(
        text = getString(R.string.widget_config_motion_note),
        color = mutedColor,
        sizeSp = 11f,
      ).apply { setLineSpacing(0f, 1.2f) },
    )

    content.addView(section(getString(R.string.widget_config_preview)))
    previewHost = FrameLayout(this)
    content.addView(
      previewHost,
      LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(type.previewHeightDp),
      ).apply { topMargin = dp(2) },
    )

    saveButton = Button(this).apply {
      text = getString(R.string.widget_config_save)
      isAllCaps = false
      textSize = 16f
      setOnClickListener { saveAndFinish() }
    }
    content.addView(
      saveButton,
      LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(52),
      ).apply { topMargin = dp(24) },
    )

    val cancel = Button(this).apply {
      text = getString(R.string.widget_config_cancel)
      isAllCaps = false
      textSize = 15f
      backgroundTintList = ColorStateList.valueOf(Color.TRANSPARENT)
      setTextColor(mutedColor)
      setOnClickListener { finish() }
    }
    content.addView(
      cancel,
      LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(48),
      ).apply { topMargin = dp(4) },
    )

    content.addView(
      label(
        text = getString(R.string.widget_config_note),
        color = mutedColor,
        sizeSp = 12f,
        topDp = 12,
      ).apply {
        setLineSpacing(0f, 1.25f)
      },
    )

    return scroll
  }

  private fun updateAccentUi() {
    kindLabel.setTextColor(accent.darkColor)
    for (radio in themeRadios) {
      radio.buttonTintList = ColorStateList.valueOf(accent.darkColor)
    }
    for (radio in transparencyRadios) {
      radio.buttonTintList = ColorStateList.valueOf(accent.darkColor)
    }
    motionCheck.buttonTintList = ColorStateList.valueOf(accent.darkColor)
    saveButton.backgroundTintList = ColorStateList.valueOf(accent.darkColor)
    saveButton.setTextColor(contrastOn(accent.darkColor))

    for ((value, view) in swatches) {
      val selected = value == accent
      val drawable = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = dp(20).toFloat()
        setColor(value.darkColor)
        setStroke(
          if (selected) dp(3) else dp(1),
          if (selected) Color.WHITE else Color.parseColor("#55FFFFFF"),
        )
      }
      view.background = drawable
      view.isSelected = selected
      view.contentDescription = getString(
        if (selected) {
          R.string.widget_config_accent_selected
        } else {
          R.string.widget_config_accent_option
        },
        getString(value.labelRes),
      )
    }
  }

  private fun updatePreview() {
    if (!::previewHost.isInitialized) return
    previewHost.removeAllViews()
    try {
      val views = WidgetRenderer.preview(
        this,
        type,
        WidgetAppearance(
          theme = theme,
          accent = accent,
          transparency = transparency,
          motion = motion,
          accentLight = accentLight,
          accentDark = accentDark,
        ),
      )
      val preview = views.apply(this, previewHost)
      previewHost.addView(
        preview,
        FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        ),
      )
    } catch (error: Exception) {
      Log.w(TAG, "Could not render widget preview", error)
      previewHost.addView(
        label(
          text = getString(R.string.widget_config_preview_failed),
          color = mutedColor,
          sizeSp = 13f,
        ),
        FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { gravity = Gravity.CENTER },
      )
    }
  }

  private fun saveAndFinish() {
    WidgetPrefs.save(
      this,
      widgetId,
      WidgetAppearance(
        theme = theme,
        accent = accent,
        transparency = transparency,
        motion = motion,
        accentLight = accentLight,
        accentDark = accentDark,
      ),
    )
    WidgetUpdater.updateOne(this, type, widgetId)

    setResult(
      RESULT_OK,
      android.content.Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId),
    )
    finish()
  }

  private fun section(text: String): TextView {
    return label(
      text = text,
      color = mutedColor,
      sizeSp = 11f,
      medium = true,
      topDp = 22,
      bottomDp = 2,
    ).apply {
      letterSpacing = 0.08f
    }
  }

  private fun label(
    text: String,
    color: Int,
    sizeSp: Float,
    medium: Boolean = false,
    topDp: Int = 0,
    bottomDp: Int = 0,
  ): TextView {
    return TextView(this).apply {
      this.text = text
      textSize = sizeSp
      setTextColor(color)
      includeFontPadding = false
      if (medium) {
        typeface = android.graphics.Typeface.create(
          "sans-serif-medium",
          android.graphics.Typeface.NORMAL,
        )
      }
      setPadding(0, dp(topDp), 0, dp(bottomDp))
    }
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

  private fun contrastOn(color: Int): Int {
    fun channel(component: Int): Double {
      val s = component / 255.0
      return if (s <= 0.04045) s / 12.92 else ((s + 0.055) / 1.055).pow(2.4)
    }
    val luminance = 0.2126 * channel(Color.red(color)) +
      0.7152 * channel(Color.green(color)) +
      0.0722 * channel(Color.blue(color))
    return if (luminance > 0.179) Color.BLACK else Color.WHITE
  }

  private companion object {
    const val TAG = "DeviceMatrixWidget"
  }
}
