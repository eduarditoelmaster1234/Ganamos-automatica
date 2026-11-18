package com.example.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val GanamosDarkColorScheme = darkColorScheme(
  primary = PrimaryViolet,
  onPrimary = TextPrimary,
  primaryContainer = SurfaceStrong,
  onPrimaryContainer = PrimarySoft,
  secondary = SuccessEmerald,
  onSecondary = TextPrimary,
  secondaryContainer = Color(0xFF0E3A23),
  onSecondaryContainer = SuccessBright,
  tertiary = PrimarySoft,
  onTertiary = BgVoid,
  background = BgVoid,
  onBackground = TextPrimary,
  surface = BgElevated,
  onSurface = TextPrimary,
  surfaceVariant = SurfaceCard,
  onSurfaceVariant = TextMuted,
  surfaceContainerLowest = BgVoid,
  surfaceContainerLow = BgElevated,
  surfaceContainer = SurfaceCard,
  surfaceContainerHigh = SurfaceStrong,
  outline = BorderSubtle,
  outlineVariant = Color(0x28A855F7),
  error = DangerRed,
  onError = TextPrimary,
)

@Composable
fun GanamosTheme(
  content: @Composable () -> Unit,
) {
  val view = LocalView.current
  if (!view.isInEditMode) {
    SideEffect {
      val window = (view.context as? Activity)?.window
      if (window != null) {
        val controller = WindowCompat.getInsetsController(window, view)
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
      }
    }
  }

  MaterialTheme(
    colorScheme = GanamosDarkColorScheme,
    typography = GanamosTypography,
    shapes = GanamosShapes,
    content = content,
  )
}
