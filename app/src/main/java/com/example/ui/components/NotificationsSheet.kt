package com.example.ui.components

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.R
import com.example.config.AppConfig
import com.example.domain.model.NotificationPermissionStatus
import com.example.ui.theme.BgElevated
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.PrimarySoft
import com.example.ui.theme.SuccessBright
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSubtle
import com.example.ui.theme.WarningAmber

fun resolveNotificationPermissionStatus(context: Context): NotificationPermissionStatus {
  val systemEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
  return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    val granted = ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.POST_NOTIFICATIONS,
    ) == PackageManager.PERMISSION_GRANTED
    when {
      granted && systemEnabled -> NotificationPermissionStatus.Granted
      !granted -> NotificationPermissionStatus.Default
      else -> NotificationPermissionStatus.Denied
    }
  } else {
    if (systemEnabled) {
      NotificationPermissionStatus.Granted
    } else {
      NotificationPermissionStatus.Denied
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsSheet(
  status: NotificationPermissionStatus,
  onStatusUpdated: (NotificationPermissionStatus) -> Unit,
  onDismissForNow: () -> Unit,
  onClose: () -> Unit,
) {
  val context = LocalContext.current
  val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission(),
  ) { granted ->
    if (granted) {
      onStatusUpdated(NotificationPermissionStatus.Granted)
    } else {
      onStatusUpdated(NotificationPermissionStatus.Denied)
    }
  }

  ModalBottomSheet(
    onDismissRequest = onClose,
    sheetState = sheetState,
    containerColor = BgElevated,
    contentColor = TextPrimary,
    shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .navigationBarsPadding()
        .padding(horizontal = 22.dp)
        .padding(bottom = 24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Text(
          text = AppConfig.domain,
          style = MaterialTheme.typography.labelLarge,
          color = PrimarySoft,
        )
        IconButton(
          onClick = onClose,
          modifier = Modifier.testTag("close_notifications_sheet"),
        ) {
          Icon(
            imageVector = Icons.Rounded.Close,
            contentDescription = stringResource(R.string.cd_close),
            tint = TextMuted,
          )
        }
      }

      Spacer(modifier = Modifier.height(6.dp))
      GanamosEmblemBadge(size = 64.dp)
      Spacer(modifier = Modifier.height(14.dp))

      when (status) {
        NotificationPermissionStatus.Granted -> {
          StatusPill(
            text = stringResource(R.string.notif_granted_title),
            tone = StatusTone.Success,
          )
          Spacer(modifier = Modifier.height(10.dp))
          Text(
            text = "Notificaciones activadas",
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(8.dp))
          Text(
            text = "El permiso de notificaciones del sistema está habilitado. Cuando el backend de alertas esté conectado, podrás recibir avisos de soporte y novedades de tu cuenta.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextMuted,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(18.dp))
          GanamosSecondaryButton(
            text = "Listo",
            onClick = onClose,
            modifier = Modifier.testTag("notifications_done_button"),
          )
        }

        NotificationPermissionStatus.Denied -> {
          StatusPill(
            text = "Permiso desactivado",
            tone = StatusTone.Warning,
          )
          Spacer(modifier = Modifier.height(10.dp))
          Text(
            text = stringResource(R.string.notif_denied_title),
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(8.dp))
          Text(
            text = "Podés habilitar las notificaciones en cualquier momento desde la configuración de la aplicación en Android.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextMuted,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(14.dp))
          Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, BorderSubtle),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Row(
              modifier = Modifier.padding(14.dp),
              horizontalArrangement = Arrangement.spacedBy(10.dp),
              verticalAlignment = Alignment.Top,
            ) {
              Icon(
                imageVector = Icons.Rounded.NotificationsOff,
                contentDescription = null,
                tint = WarningAmber,
                modifier = Modifier.size(20.dp),
              )
              Text(
                text = "Ajustes de Android → Aplicaciones → ${AppConfig.brandName} → Notificaciones → Permitir.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
              )
            }
          }
          Spacer(modifier = Modifier.height(16.dp))
          GanamosPrimaryButton(
            text = stringResource(R.string.notif_open_settings),
            leadingIcon = Icons.Rounded.Settings,
            onClick = {
              val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
              }
              runCatching { context.startActivity(intent) }
            },
            modifier = Modifier.testTag("notifications_open_settings_button"),
          )
          Spacer(modifier = Modifier.height(8.dp))
          TextButton(
            onClick = onDismissForNow,
            modifier = Modifier.testTag("notifications_later_button"),
          ) {
            Text(
              text = stringResource(R.string.notif_later_cta),
              color = TextMuted,
            )
          }
        }

        NotificationPermissionStatus.Default -> {
          Text(
            text = "Activar notificaciones",
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(8.dp))
          Text(
            text = "Usaremos este permiso únicamente para avisarte sobre respuestas del chat de soporte y actualizaciones importantes de tu cuenta.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextMuted,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(16.dp))
          GanamosPrimaryButton(
            text = stringResource(R.string.notif_activate_cta),
            leadingIcon = Icons.Rounded.NotificationsActive,
            onClick = {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
              } else {
                onStatusUpdated(resolveNotificationPermissionStatus(context))
              }
            },
            modifier = Modifier.testTag("notifications_activate_button"),
          )
          Spacer(modifier = Modifier.height(8.dp))
          TextButton(
            onClick = onDismissForNow,
            modifier = Modifier.testTag("notifications_later_button"),
          ) {
            Text(
              text = stringResource(R.string.notif_later_cta),
              color = TextMuted,
            )
          }
        }

        NotificationPermissionStatus.Unsupported -> {
          Text(
            text = "Notificaciones no disponibles",
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(8.dp))
          Text(
            text = "Este dispositivo o perfil del sistema no admite notificaciones para esta aplicación.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSubtle,
            textAlign = TextAlign.Center,
          )
          Spacer(modifier = Modifier.height(16.dp))
          GanamosSecondaryButton(
            text = "Cerrar",
            onClick = onClose,
          )
        }
      }
    }
  }
}
