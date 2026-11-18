package com.example.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.ui.theme.BgElevated
import com.example.ui.theme.BgVoid
import com.example.ui.theme.BorderFocus
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.DangerRed
import com.example.ui.theme.PrimarySoft
import com.example.ui.theme.PrimaryStrong
import com.example.ui.theme.PrimaryViolet
import com.example.ui.theme.SuccessBright
import com.example.ui.theme.SuccessEmerald
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceStrong
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSubtle
import com.example.ui.theme.WarningAmber
import kotlinx.coroutines.delay

@Composable
fun GanamosBackground(
  modifier: Modifier = Modifier,
  content: @Composable BoxScope.() -> Unit,
) {
  Box(
    modifier = modifier
      .fillMaxSize()
      .background(BgVoid),
  ) {
    Canvas(modifier = Modifier.fillMaxSize()) {
      drawCircle(
        brush = Brush.radialGradient(
          colors = listOf(
            PrimaryViolet.copy(alpha = 0.22f),
            PrimaryStrong.copy(alpha = 0.08f),
            Color.Transparent,
          ),
          center = Offset(size.width * 0.5f, size.height * 0.14f),
          radius = size.maxDimension * 0.55f,
        ),
      )
      drawCircle(
        brush = Brush.radialGradient(
          colors = listOf(
            PrimaryStrong.copy(alpha = 0.14f),
            Color.Transparent,
          ),
          center = Offset(size.width * 0.85f, size.height * 0.85f),
          radius = size.maxDimension * 0.45f,
        ),
      )
    }
    content()
  }
}

@Composable
fun GanamosEmblemBadge(
  size: Dp = 76.dp,
  modifier: Modifier = Modifier,
) {
  Box(
    modifier = modifier
      .size(size)
      .shadow(
        elevation = 16.dp,
        shape = RoundedCornerShape(22.dp),
        ambientColor = PrimaryViolet.copy(alpha = 0.45f),
        spotColor = PrimaryViolet.copy(alpha = 0.45f),
      )
      .clip(RoundedCornerShape(22.dp))
      .border(1.dp, BorderSubtle, RoundedCornerShape(22.dp))
      .background(SurfaceCard),
    contentAlignment = Alignment.Center,
  ) {
    Image(
      painter = painterResource(id = R.drawable.img_ganamos_emblem),
      contentDescription = stringResource(R.string.cd_brand_emblem),
      modifier = Modifier.fillMaxSize(),
      contentScale = ContentScale.Crop,
    )
  }
}

@Composable
fun GanamosWordmark(
  modifier: Modifier = Modifier,
  compact: Boolean = false,
) {
  Row(
    modifier = modifier.semantics(mergeDescendants = true) {
      contentDescription = "Ganamos, ganamos.net"
    },
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    Box(
      modifier = Modifier
        .size(if (compact) 30.dp else 36.dp)
        .clip(RoundedCornerShape(10.dp))
        .border(1.dp, BorderSubtle, RoundedCornerShape(10.dp))
        .background(SurfaceStrong),
      contentAlignment = Alignment.Center,
    ) {
      Image(
        painter = painterResource(id = R.drawable.img_ganamos_launcher),
        contentDescription = null,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop,
      )
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
      Text(
        text = "GANAMOS",
        style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.ExtraBold,
        color = TextPrimary,
      )
      Spacer(modifier = Modifier.width(6.dp))
      Surface(
        color = PrimaryStrong.copy(alpha = 0.28f),
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.dp, BorderSubtle),
      ) {
        Text(
          text = ".net",
          style = MaterialTheme.typography.labelSmall,
          color = PrimarySoft,
          modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
        )
      }
    }
  }
}

enum class StatusTone {
  Success,
  Warning,
  Danger,
  Neutral,
}

@Composable
fun StatusPill(
  text: String,
  tone: StatusTone,
  modifier: Modifier = Modifier,
) {
  val (containerColor, contentColor, icon) = when (tone) {
    StatusTone.Success -> Triple(
      SuccessEmerald.copy(alpha = 0.16f),
      SuccessBright,
      Icons.Rounded.CheckCircle,
    )
    StatusTone.Warning -> Triple(
      WarningAmber.copy(alpha = 0.16f),
      WarningAmber,
      Icons.Rounded.Schedule,
    )
    StatusTone.Danger -> Triple(
      DangerRed.copy(alpha = 0.16f),
      DangerRed,
      Icons.Rounded.CloudOff,
    )
    StatusTone.Neutral -> Triple(
      SurfaceStrong,
      TextMuted,
      Icons.Rounded.Info,
    )
  }

  Surface(
    modifier = modifier,
    color = containerColor,
    shape = RoundedCornerShape(999.dp),
    border = BorderStroke(1.dp, contentColor.copy(alpha = 0.35f)),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
      Icon(
        imageVector = icon,
        contentDescription = null,
        tint = contentColor,
        modifier = Modifier.size(14.dp),
      )
      Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        color = contentColor,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
    }
  }
}

@Composable
fun GanamosPrimaryButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  loading: Boolean = false,
  leadingIcon: ImageVector? = null,
  isSuccessStyle: Boolean = false,
) {
  val shape = RoundedCornerShape(16.dp)
  val activeBrush = if (isSuccessStyle) {
    Brush.horizontalGradient(listOf(SuccessEmerald, SuccessBright))
  } else {
    Brush.horizontalGradient(listOf(PrimaryStrong, PrimaryViolet))
  }
  val glowColor = if (isSuccessStyle) SuccessEmerald else PrimaryViolet

  Button(
    onClick = onClick,
    enabled = enabled && !loading,
    shape = shape,
    contentPadding = PaddingValues(0.dp),
    colors = ButtonDefaults.buttonColors(
      containerColor = Color.Transparent,
      disabledContainerColor = SurfaceStrong.copy(alpha = 0.65f),
      contentColor = TextPrimary,
      disabledContentColor = TextSubtle,
    ),
    modifier = modifier
      .fillMaxWidth()
      .heightIn(min = 54.dp)
      .then(
        if (enabled && !loading) {
          Modifier.shadow(
            elevation = 12.dp,
            shape = shape,
            ambientColor = glowColor.copy(alpha = 0.45f),
            spotColor = glowColor.copy(alpha = 0.45f),
          )
        } else {
          Modifier
        }
      ),
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .heightIn(min = 54.dp)
        .background(
          brush = if (enabled && !loading) {
            activeBrush
          } else {
            Brush.horizontalGradient(listOf(SurfaceStrong, SurfaceStrong))
          },
          shape = shape,
        )
        .padding(horizontal = 20.dp, vertical = 14.dp),
      contentAlignment = Alignment.Center,
    ) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        if (loading) {
          CircularProgressIndicator(
            modifier = Modifier.size(18.dp),
            strokeWidth = 2.dp,
            color = TextPrimary,
          )
        } else if (leadingIcon != null) {
          Icon(
            imageVector = leadingIcon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
          )
        }
        Text(
          text = text,
          style = MaterialTheme.typography.labelLarge,
          fontWeight = FontWeight.Bold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
      }
    }
  }
}

@Composable
fun GanamosSecondaryButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  leadingIcon: ImageVector? = null,
) {
  OutlinedButton(
    onClick = onClick,
    enabled = enabled,
    shape = RoundedCornerShape(16.dp),
    border = BorderStroke(1.dp, BorderSubtle),
    colors = ButtonDefaults.outlinedButtonColors(
      containerColor = BgElevated.copy(alpha = 0.85f),
      contentColor = TextPrimary,
      disabledContentColor = TextSubtle,
    ),
    modifier = modifier
      .fillMaxWidth()
      .heightIn(min = 50.dp),
  ) {
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      if (leadingIcon != null) {
        Icon(
          imageVector = leadingIcon,
          contentDescription = null,
          modifier = Modifier.size(18.dp),
        )
      }
      Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
    }
  }
}

@Composable
fun GanamosLabeledTextField(
  label: String,
  value: String,
  onValueChange: (String) -> Unit,
  placeholder: String,
  modifier: Modifier = Modifier,
  errorText: String? = null,
  enabled: Boolean = true,
  keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
  keyboardActions: KeyboardActions = KeyboardActions.Default,
  inputTestTag: String = "labeled_text_field",
) {
  Column(modifier = modifier.fillMaxWidth()) {
    Text(
      text = label,
      style = MaterialTheme.typography.labelLarge,
      color = TextPrimary,
      modifier = Modifier.padding(bottom = 8.dp),
    )
    OutlinedTextField(
      value = value,
      onValueChange = onValueChange,
      enabled = enabled,
      singleLine = true,
      isError = errorText != null,
      placeholder = {
        Text(
          text = placeholder,
          style = MaterialTheme.typography.bodyLarge,
          color = TextSubtle,
        )
      },
      textStyle = MaterialTheme.typography.bodyLarge.copy(color = TextPrimary),
      shape = RoundedCornerShape(14.dp),
      colors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = BgVoid,
        unfocusedContainerColor = BgVoid,
        disabledContainerColor = BgVoid.copy(alpha = 0.6f),
        focusedBorderColor = BorderFocus,
        unfocusedBorderColor = BorderSubtle,
        errorBorderColor = DangerRed,
        cursorColor = PrimarySoft,
      ),
      keyboardOptions = keyboardOptions,
      keyboardActions = keyboardActions,
      modifier = Modifier
        .fillMaxWidth()
        .heightIn(min = 56.dp)
        .testTag(inputTestTag),
    )
    AnimatedVisibility(
      visible = errorText != null,
      enter = fadeIn(),
      exit = fadeOut(),
    ) {
      Row(
        modifier = Modifier
          .padding(top = 6.dp)
          .semantics { liveRegion = LiveRegionMode.Polite },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
      ) {
        Icon(
          imageVector = Icons.Rounded.ErrorOutline,
          contentDescription = null,
          tint = DangerRed,
          modifier = Modifier.size(16.dp),
        )
        Text(
          text = errorText.orEmpty(),
          style = MaterialTheme.typography.bodySmall,
          color = DangerRed,
        )
      }
    }
  }
}

@Composable
fun CopyableCredentialRow(
  label: String,
  value: String,
  copyActionLabel: String,
  modifier: Modifier = Modifier,
  buttonTestTag: String = "copy_button",
) {
  val context = LocalContext.current
  var copied by remember { mutableStateOf(false) }

  LaunchedEffect(copied) {
    if (copied) {
      delay(2000)
      copied = false
    }
  }

  Surface(
    modifier = modifier.fillMaxWidth(),
    color = BgVoid,
    shape = RoundedCornerShape(14.dp),
    border = BorderStroke(1.dp, if (copied) SuccessBright.copy(alpha = 0.6f) else BorderSubtle),
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(start = 14.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.SpaceBetween,
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = label.uppercase(),
          style = MaterialTheme.typography.labelSmall,
          color = TextSubtle,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
          text = value,
          style = MaterialTheme.typography.titleMedium,
          fontWeight = FontWeight.Bold,
          color = TextPrimary,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
      }
      Spacer(modifier = Modifier.width(8.dp))
      Surface(
        modifier = Modifier
          .minimumInteractiveComponentSize()
          .clip(RoundedCornerShape(12.dp))
          .clickable {
            copyToClipboard(context, label, value)
            copied = true
          }
          .testTag(buttonTestTag),
        color = if (copied) SuccessEmerald.copy(alpha = 0.22f) else SurfaceStrong,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(
          1.dp,
          if (copied) SuccessBright.copy(alpha = 0.5f) else BorderSubtle,
        ),
      ) {
        Row(
          modifier = Modifier
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
          Icon(
            imageVector = if (copied) Icons.Rounded.Check else Icons.Rounded.ContentCopy,
            contentDescription = copyActionLabel,
            tint = if (copied) SuccessBright else PrimarySoft,
            modifier = Modifier.size(16.dp),
          )
          Text(
            text = if (copied) stringResource(R.string.created_copied) else copyActionLabel,
            style = MaterialTheme.typography.labelMedium,
            color = if (copied) SuccessBright else TextPrimary,
          )
        }
      }
    }
  }
}

fun copyToClipboard(context: Context, label: String, value: String) {
  val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
  clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
}
