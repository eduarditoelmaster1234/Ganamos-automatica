package com.example.ui.screens

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.domain.model.EphemeralCredentials
import com.example.domain.model.PlayerAccount
import com.example.ui.components.CopyableCredentialRow
import com.example.ui.components.GanamosBackground
import com.example.ui.components.GanamosPrimaryButton
import com.example.ui.components.StatusPill
import com.example.ui.components.StatusTone
import com.example.ui.theme.BgElevated
import com.example.ui.theme.SuccessEmerald
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSubtle
import com.example.ui.theme.WarningAmber

@Composable
fun AccountCreatedScreen(
  account: PlayerAccount,
  credentials: EphemeralCredentials?,
  onContinue: () -> Unit,
) {
  var revealed by remember { mutableStateOf(false) }
  LaunchedEffect(Unit) { revealed = true }
  val badgeScale by animateFloatAsState(
    targetValue = if (revealed) 1f else 0.8f,
    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
    label = "created_badge_scale",
  )

  val isDemo = account.isDemo

  GanamosBackground {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .safeDrawingPadding()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp, vertical = 24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Surface(
        color = BgElevated.copy(alpha = 0.94f),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, SuccessEmerald.copy(alpha = 0.45f)),
        modifier = Modifier.widthIn(max = 440.dp),
      ) {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 26.dp),
          horizontalAlignment = Alignment.CenterHorizontally,
        ) {
          Box(
            modifier = Modifier
              .size(60.dp)
              .scale(badgeScale)
              .shadow(
                elevation = 12.dp,
                shape = CircleShape,
                ambientColor = SuccessEmerald.copy(alpha = 0.5f),
                spotColor = SuccessEmerald.copy(alpha = 0.5f),
              )
              .background(color = SuccessEmerald, shape = CircleShape),
            contentAlignment = Alignment.Center,
          ) {
            Icon(
              imageVector = Icons.Rounded.Check,
              contentDescription = null,
              tint = TextPrimary,
              modifier = Modifier.size(30.dp),
            )
          }

          Spacer(modifier = Modifier.height(14.dp))

          if (isDemo) {
            StatusPill(
              text = stringResource(R.string.demo_mode_badge),
              tone = StatusTone.Warning,
              modifier = Modifier.testTag("demo_created_pill"),
            )
            Spacer(modifier = Modifier.height(8.dp))
          }

          Text(
            text = stringResource(R.string.created_title),
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
            textAlign = TextAlign.Center,
          )

          if (isDemo) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = stringResource(R.string.demo_mode_banner),
              style = MaterialTheme.typography.bodySmall,
              color = WarningAmber,
              textAlign = TextAlign.Center,
            )
          }

          Spacer(modifier = Modifier.height(20.dp))

          CopyableCredentialRow(
            label = stringResource(R.string.created_username_label),
            value = credentials?.username ?: account.username,
            copyActionLabel = stringResource(R.string.created_copy_username),
            buttonTestTag = "copy_username_button",
          )

          val tempPassword = credentials?.temporaryPassword
          if (!isDemo && !tempPassword.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            CopyableCredentialRow(
              label = stringResource(R.string.created_password_label),
              value = tempPassword,
              copyActionLabel = stringResource(R.string.created_copy_password),
              buttonTestTag = "copy_password_button",
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = stringResource(R.string.created_password_note),
              style = MaterialTheme.typography.bodySmall,
              color = TextMuted,
              textAlign = TextAlign.Center,
            )
          }

          Spacer(modifier = Modifier.height(20.dp))

          GanamosPrimaryButton(
            text = stringResource(R.string.created_continue_cta),
            onClick = onContinue,
            isSuccessStyle = true,
            modifier = Modifier.testTag("continue_to_account_button"),
          )

          Spacer(modifier = Modifier.height(12.dp))

          Text(
            text = stringResource(R.string.created_helper),
            style = MaterialTheme.typography.bodySmall,
            color = TextSubtle,
            textAlign = TextAlign.Center,
          )
        }
      }
    }
  }
}
