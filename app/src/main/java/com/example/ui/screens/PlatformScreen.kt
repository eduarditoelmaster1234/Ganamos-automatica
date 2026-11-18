package com.example.ui.screens

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.R
import com.example.config.AppConfig
import com.example.domain.model.LegalDocumentType
import com.example.domain.model.ReceiptAttachment
import com.example.ui.ChatQuickAction
import com.example.ui.GanamosUiState
import com.example.ui.components.GanamosBackground
import com.example.ui.components.GanamosEmblemBadge
import com.example.ui.components.GanamosPrimaryButton
import com.example.ui.components.GanamosSecondaryButton
import com.example.ui.components.copyToClipboard
import com.example.ui.theme.BgElevated
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.PrimarySoft
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

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PlatformScreen(
  uiState: GanamosUiState,
  onOpenChat: () -> Unit,
  onMinimizeChat: () -> Unit,
  onQuickAction: (ChatQuickAction) -> Unit,
  onComposerChanged: (String) -> Unit,
  onSendMessage: () -> Unit,
  onReceiptSelected: (ReceiptAttachment) -> Unit,
  onClearReceipt: () -> Unit,
  onUploadReceipt: () -> Unit,
  onToggleCredentialPillMinimized: (Boolean) -> Unit,
  onOpenNotifications: () -> Unit,
  onOpenLegal: (LegalDocumentType) -> Unit,
  onSignOut: () -> Unit,
) {
  val context = LocalContext.current
  var isLoadingPage by remember { mutableStateOf(AppConfig.embedAllowed) }
  var embedErrorReason by remember { mutableStateOf<String?>(null) }
  var reloadTrigger by remember { mutableStateOf(0) }
  var webViewRef by remember { mutableStateOf<WebView?>(null) }
  var canGoBack by remember { mutableStateOf(false) }

  var pillMenuExpanded by remember { mutableStateOf(false) }
  var copiedItem by remember { mutableStateOf<String?>(null) }

  LaunchedEffect(copiedItem) {
    if (copiedItem != null) {
      delay(2000)
      copiedItem = null
    }
  }

  BackHandler(enabled = canGoBack && !uiState.isChatOpen) {
    webViewRef?.goBack()
  }

  val openInExternalBrowser: () -> Unit = {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(AppConfig.platformUrl)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching { context.startActivity(intent) }
  }

  GanamosBackground {
    Box(modifier = Modifier.fillMaxSize()) {
      // Full-screen integrated platform container (no custom header bar)
      if (AppConfig.embedAllowed && uiState.isOnline && embedErrorReason == null) {
        Box(
          modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding(),
        ) {
          AndroidView(
            factory = { ctx ->
              WebView(ctx).apply {
                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                webChromeClient = WebChromeClient()
                webViewClient = object : WebViewClient() {
                  override fun onPageStarted(
                    view: WebView?,
                    url: String?,
                    favicon: android.graphics.Bitmap?,
                  ) {
                    isLoadingPage = true
                    canGoBack = view?.canGoBack() == true
                  }

                  override fun onPageFinished(view: WebView?, url: String?) {
                    isLoadingPage = false
                    canGoBack = view?.canGoBack() == true
                  }

                  override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?,
                  ) {
                    if (request?.isForMainFrame == true) {
                      isLoadingPage = false
                      embedErrorReason =
                        error?.description?.toString()?.takeIf { it.isNotBlank() }
                          ?: "No se pudo conectar con ${AppConfig.domain}."
                    }
                  }

                  override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?,
                  ) {
                    if (request?.isForMainFrame == true && (errorResponse?.statusCode ?: 0) >= 400) {
                      isLoadingPage = false
                      val code = errorResponse?.statusCode
                      embedErrorReason =
                        "El servidor respondió con estado HTTP $code al intentar integrar ${AppConfig.domain}."
                    }
                  }
                }
                loadUrl(AppConfig.platformUrl)
                webViewRef = this
              }
            },
            update = { view ->
              if (reloadTrigger > 0) {
                view.loadUrl(AppConfig.platformUrl)
              }
            },
            modifier = Modifier
              .fillMaxSize()
              .testTag("platform_webview"),
          )

          if (isLoadingPage) {
            LinearProgressIndicator(
              modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter),
              color = PrimaryViolet,
              trackColor = SurfaceStrong,
            )
          }
        }
      } else {
        // Honest, elegant in-app message if ganamos.net blocks embedding or offline (never auto-redirects externally)
        Box(
          modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 20.dp),
          contentAlignment = Alignment.Center,
        ) {
          Surface(
            color = BgElevated.copy(alpha = 0.96f),
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, BorderSubtle),
            modifier = Modifier
              .widthIn(max = 440.dp)
              .testTag("platform_embed_error_card"),
          ) {
            Column(
              modifier = Modifier.padding(24.dp),
              horizontalAlignment = Alignment.CenterHorizontally,
              verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
              GanamosEmblemBadge(size = 64.dp)
              Text(
                text = if (!uiState.isOnline) {
                  "Sin conexión a internet"
                } else {
                  stringResource(R.string.platform_embed_error_title)
                },
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                textAlign = TextAlign.Center,
              )
              Text(
                text = embedErrorReason ?: if (!uiState.isOnline) {
                  "Verificá tu conexión para cargar ${AppConfig.domain} dentro de Ganamos."
                } else {
                  stringResource(R.string.platform_embed_error_body)
                },
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
                textAlign = TextAlign.Center,
              )
              GanamosPrimaryButton(
                text = stringResource(R.string.platform_retry_cta),
                leadingIcon = Icons.Rounded.Refresh,
                onClick = {
                  embedErrorReason = null
                  isLoadingPage = true
                  reloadTrigger += 1
                },
                modifier = Modifier.testTag("platform_retry_button"),
              )
              GanamosSecondaryButton(
                text = stringResource(R.string.platform_open_cta),
                leadingIcon = Icons.AutoMirrored.Rounded.OpenInNew,
                onClick = openInExternalBrowser,
                modifier = Modifier.testTag("platform_open_external_button"),
              )
            }
          }
        }
      }

      // 6. Píldora flotante de credenciales (esquina superior izquierda)
      val username = uiState.activeAccount?.username.orEmpty()
      val tempPassword = uiState.ephemeralCredentials?.temporaryPassword

      Box(
        modifier = Modifier
          .align(Alignment.TopStart)
          .statusBarsPadding()
          .padding(start = 12.dp, top = 10.dp),
      ) {
        if (uiState.isCredentialPillMinimized) {
          Surface(
            color = BgElevated.copy(alpha = 0.9f),
            shape = CircleShape,
            border = BorderStroke(1.dp, BorderSubtle),
            shadowElevation = 6.dp,
            modifier = Modifier
              .size(44.dp)
              .clip(CircleShape)
              .clickable { onToggleCredentialPillMinimized(false) }
              .testTag("credential_pill_minimized"),
          ) {
            Box(contentAlignment = Alignment.Center) {
              Icon(
                imageVector = Icons.Rounded.Person,
                contentDescription = stringResource(R.string.cd_account_menu),
                tint = PrimarySoft,
                modifier = Modifier.size(20.dp),
              )
            }
          }
        } else {
          Box {
            Surface(
              color = BgElevated.copy(alpha = 0.9f),
              shape = RoundedCornerShape(999.dp),
              border = BorderStroke(1.dp, BorderSubtle),
              shadowElevation = 6.dp,
              modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .clickable { pillMenuExpanded = true }
                .testTag("credential_pill"),
            ) {
              Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
              ) {
                Icon(
                  imageVector = Icons.Rounded.AccountCircle,
                  contentDescription = stringResource(R.string.cd_account_menu),
                  tint = PrimarySoft,
                  modifier = Modifier.size(16.dp),
                )
                Text(
                  text = username.ifBlank { "Cuenta" },
                  style = MaterialTheme.typography.labelMedium,
                  fontWeight = FontWeight.SemiBold,
                  color = TextPrimary,
                  maxLines = 1,
                  overflow = TextOverflow.Ellipsis,
                  modifier = Modifier.widthIn(max = 128.dp),
                )
                if (uiState.activeAccount?.isDemo == true) {
                  Text(
                    text = "· Demo",
                    style = MaterialTheme.typography.labelSmall,
                    color = WarningAmber,
                  )
                }
              }
            }

            DropdownMenu(
              expanded = pillMenuExpanded,
              onDismissRequest = { pillMenuExpanded = false },
              containerColor = SurfaceCard,
            ) {
              DropdownMenuItem(
                text = {
                  Text(
                    text = if (copiedItem == "user") {
                      stringResource(R.string.created_copied)
                    } else {
                      stringResource(R.string.created_copy_username)
                    },
                    color = if (copiedItem == "user") SuccessBright else TextPrimary,
                  )
                },
                leadingIcon = {
                  Icon(Icons.Rounded.ContentCopy, contentDescription = null, tint = PrimarySoft)
                },
                onClick = {
                  if (username.isNotBlank()) {
                    copyToClipboard(context, "Usuario", username)
                    copiedItem = "user"
                  }
                },
                modifier = Modifier.testTag("pill_copy_username"),
              )

              if (!tempPassword.isNullOrBlank()) {
                DropdownMenuItem(
                  text = {
                    Text(
                      text = if (copiedItem == "pass") {
                        stringResource(R.string.created_copied)
                      } else {
                        stringResource(R.string.created_copy_password)
                      },
                      color = if (copiedItem == "pass") SuccessBright else TextPrimary,
                    )
                  },
                  leadingIcon = {
                    Icon(Icons.Rounded.Key, contentDescription = null, tint = PrimarySoft)
                  },
                  onClick = {
                    copyToClipboard(context, "Clave", tempPassword)
                    copiedItem = "pass"
                  },
                  modifier = Modifier.testTag("pill_copy_password"),
                )
              }

              HorizontalDivider(color = BorderSubtle)

              DropdownMenuItem(
                text = { Text(stringResource(R.string.notif_title), color = TextPrimary) },
                leadingIcon = {
                  Icon(Icons.Rounded.Notifications, contentDescription = null, tint = TextMuted)
                },
                onClick = {
                  pillMenuExpanded = false
                  onOpenNotifications()
                },
              )

              DropdownMenuItem(
                text = { Text(stringResource(R.string.legal_responsible), color = TextPrimary) },
                leadingIcon = {
                  Icon(Icons.Rounded.Shield, contentDescription = null, tint = TextMuted)
                },
                onClick = {
                  pillMenuExpanded = false
                  onOpenLegal(LegalDocumentType.ResponsibleGaming)
                },
              )

              DropdownMenuItem(
                text = { Text("Minimizar píldora", color = TextPrimary) },
                leadingIcon = {
                  Icon(Icons.Rounded.Remove, contentDescription = null, tint = TextMuted)
                },
                onClick = {
                  pillMenuExpanded = false
                  onToggleCredentialPillMinimized(true)
                },
                modifier = Modifier.testTag("pill_minimize_action"),
              )

              DropdownMenuItem(
                text = { Text(stringResource(R.string.platform_sign_out), color = WarningAmber) },
                leadingIcon = {
                  Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = null, tint = WarningAmber)
                },
                onClick = {
                  pillMenuExpanded = false
                  onSignOut()
                },
                modifier = Modifier.testTag("sign_out_button"),
              )

              DropdownMenuItem(
                text = { Text("Cerrar menú", color = TextSubtle) },
                leadingIcon = {
                  Icon(Icons.Rounded.Close, contentDescription = null, tint = TextSubtle)
                },
                onClick = { pillMenuExpanded = false },
              )
            }
          }
        }
      }

      // 7 & 8. Chat integrado estilo WhatsApp (abierto automáticamente tras registro o restaurable)
      AnimatedVisibility(
        visible = uiState.isChatOpen,
        enter = fadeIn(),
        exit = fadeOut(),
      ) {
        SupportChatOverlay(
          uiState = uiState,
          onMinimize = onMinimizeChat,
          onQuickAction = onQuickAction,
          onComposerChanged = onComposerChanged,
          onSendMessage = onSendMessage,
          onReceiptSelected = onReceiptSelected,
          onClearReceipt = onClearReceipt,
          onUploadReceipt = onUploadReceipt,
        )
      }

      // 12. Burbuja flotante minimizada (esquina inferior derecha)
      AnimatedVisibility(
        visible = !uiState.isChatOpen,
        modifier = Modifier
          .align(Alignment.BottomEnd)
          .navigationBarsPadding()
          .padding(end = 16.dp, bottom = 16.dp),
        enter = fadeIn(),
        exit = fadeOut(),
      ) {
        Box {
          Surface(
            color = SuccessEmerald,
            shape = CircleShape,
            modifier = Modifier
              .size(56.dp)
              .shadow(10.dp, CircleShape)
              .clip(CircleShape)
              .clickable(onClick = onOpenChat)
              .testTag("chat_minimized_bubble"),
          ) {
            Box(contentAlignment = Alignment.Center) {
              Icon(
                imageVector = Icons.AutoMirrored.Rounded.Chat,
                contentDescription = stringResource(R.string.cd_open_chat),
                tint = Color.White,
                modifier = Modifier.size(26.dp),
              )
            }
          }
          if (uiState.unreadChatCount > 0) {
            Box(
              modifier = Modifier
                .align(Alignment.TopEnd)
                .size(14.dp)
                .background(WarningAmber, CircleShape),
            )
          }
        }
      }
    }
  }
}
