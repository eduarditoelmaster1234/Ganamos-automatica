package com.example.ui.screens

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.AttachFile
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material.icons.rounded.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.R
import com.example.domain.model.AsyncState
import com.example.domain.model.BankTransferDetails
import com.example.domain.model.ChatConnectionStatus
import com.example.domain.model.ChatMessage
import com.example.domain.model.MessageDeliveryStatus
import com.example.domain.model.MessageSender
import com.example.domain.model.ReceiptAttachment
import com.example.domain.model.ReceiptUploadState
import com.example.ui.ChatQuickAction
import com.example.ui.GanamosUiState
import com.example.ui.components.copyToClipboard
import com.example.ui.theme.DangerRed
import com.example.ui.theme.SuccessBright
import com.example.ui.theme.SuccessEmerald
import com.example.ui.theme.WaActionGreen
import com.example.ui.theme.WaAvatarTeal
import com.example.ui.theme.WaBubbleIncoming
import com.example.ui.theme.WaBubbleOutgoing
import com.example.ui.theme.WaComposerBg
import com.example.ui.theme.WaConversationCream
import com.example.ui.theme.WaDivider
import com.example.ui.theme.WaHeaderGreen
import com.example.ui.theme.WaSubCardGray
import com.example.ui.theme.WaSystemBannerBg
import com.example.ui.theme.WaSystemBannerText
import com.example.ui.theme.WaTextDark
import com.example.ui.theme.WaTextSecondary
import com.example.ui.theme.WarningAmber
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun SupportChatOverlay(
  uiState: GanamosUiState,
  onMinimize: () -> Unit,
  onQuickAction: (ChatQuickAction) -> Unit,
  onComposerChanged: (String) -> Unit,
  onSendMessage: () -> Unit,
  onReceiptSelected: (ReceiptAttachment) -> Unit,
  onClearReceipt: () -> Unit,
  onUploadReceipt: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val listState = rememberLazyListState()
  val scope = rememberCoroutineScope()
  var showAttachmentOptions by remember { mutableStateOf(false) }

  val photoPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.PickVisualMedia(),
  ) { uri ->
    if (uri != null) {
      readAttachmentMeta(context.contentResolver, uri)?.let(onReceiptSelected)
    }
  }

  val documentPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.OpenDocument(),
  ) { uri ->
    if (uri != null) {
      readAttachmentMeta(context.contentResolver, uri)?.let(onReceiptSelected)
    }
  }

  val launchReceiptPicker: () -> Unit = {
    showAttachmentOptions = !showAttachmentOptions
  }

  LaunchedEffect(uiState.chatMessages.size) {
    if (uiState.chatMessages.isNotEmpty()) {
      listState.animateScrollToItem(uiState.chatMessages.size + 1)
    }
  }

  BoxWithConstraints(
    modifier = modifier
      .fillMaxSize()
      .navigationBarsPadding()
      .imePadding(),
  ) {
    val isDesktopOrTablet = maxWidth >= 720.dp
    val cardModifier = if (isDesktopOrTablet) {
      Modifier
        .align(Alignment.BottomEnd)
        .padding(end = 16.dp, bottom = 16.dp)
        .width(368.dp)
        .heightIn(min = 420.dp, max = (maxHeight * 0.78f).coerceAtMost(620.dp))
        .shadow(16.dp, RoundedCornerShape(20.dp))
    } else {
      Modifier
        .align(Alignment.BottomCenter)
        .fillMaxWidth()
        .padding(top = 48.dp)
        .heightIn(max = (maxHeight * 0.86f))
        .shadow(18.dp, RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
    }

    val containerShape = if (isDesktopOrTablet) {
      RoundedCornerShape(20.dp)
    } else {
      RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    }

    Surface(
      modifier = cardModifier.testTag("whatsapp_chat_container"),
      shape = containerShape,
      color = WaConversationCream,
    ) {
      Column(modifier = Modifier.fillMaxSize()) {
        // 8.1 Header estilo WhatsApp (identidad Ganamos)
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .background(WaHeaderGreen)
            .padding(horizontal = 12.dp, vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.SpaceBetween,
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            Box(
              modifier = Modifier
                .size(38.dp)
                .background(WaAvatarTeal, CircleShape),
              contentAlignment = Alignment.Center,
            ) {
              Text(
                text = "G",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
              )
            }

            Column {
              Text(
                text = stringResource(R.string.chat_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
              )
              Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(5.dp),
              ) {
                val (subtitle, dotColor) = when {
                  uiState.chatConnectionStatus == ChatConnectionStatus.Online ->
                    stringResource(R.string.chat_status_online) to SuccessBright
                  uiState.chatConnectionStatus == ChatConnectionStatus.Connecting ->
                    stringResource(R.string.chat_status_connecting) to WarningAmber
                  uiState.chatConnectionStatus == ChatConnectionStatus.Offline ->
                    stringResource(R.string.chat_status_offline) to DangerRed
                  uiState.activeAccount?.isDemo == true ->
                    stringResource(R.string.chat_status_demo) to WarningAmber
                  else ->
                    stringResource(R.string.chat_status_pending) to Color(0xFFD1D5DB)
                }
                Box(
                  modifier = Modifier
                    .size(7.dp)
                    .background(dotColor, CircleShape),
                )
                Text(
                  text = subtitle,
                  style = MaterialTheme.typography.labelSmall,
                  color = Color.White.copy(alpha = 0.9f),
                )
              }
            }
          }

          IconButton(
            onClick = onMinimize,
            modifier = Modifier
              .minimumInteractiveComponentSize()
              .testTag("chat_close_minimize_button"),
          ) {
            Icon(
              imageVector = Icons.Rounded.Close,
              contentDescription = stringResource(R.string.cd_minimize),
              tint = Color.White,
            )
          }
        }

        // 8.2 Cream conversation background with subtle low-opacity geometric pattern
        Box(
          modifier = Modifier
            .weight(1f)
            .fillMaxWidth()
            .background(WaConversationCream),
        ) {
          SubtleChatPatternBackground(modifier = Modifier.fillMaxSize())

          LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            // 8.3 Sky-blue connection banner
            item(key = "connection_banner") {
              val bannerText = when {
                uiState.chatConnectionStatus == ChatConnectionStatus.Online ->
                  stringResource(R.string.chat_banner_connected)
                uiState.activeAccount?.isDemo == true ->
                  stringResource(R.string.chat_banner_demo)
                uiState.chatConnectionStatus == ChatConnectionStatus.Offline ->
                  stringResource(R.string.chat_banner_offline)
                else ->
                  stringResource(R.string.chat_banner_pending)
              }
              Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center,
              ) {
                Surface(
                  color = WaSystemBannerBg,
                  shape = RoundedCornerShape(10.dp),
                  shadowElevation = 1.dp,
                ) {
                  Text(
                    text = bannerText,
                    style = MaterialTheme.typography.labelMedium,
                    color = WaSystemBannerText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                  )
                }
              }
            }

            // 8.4 - 8.7 Automatic Transfer Bubble + Bank Table + Copy + Upload Receipt
            item(key = "transfer_bubble") {
              WhatsAppTransferBubble(
                paymentState = uiState.paymentDetailsState,
                onUploadClick = {
                  photoPickerLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                  )
                },
              )
            }

            // Dynamic chat messages
            items(uiState.chatMessages, key = { it.id }) { message ->
              WhatsAppMessageBubble(message = message)
            }
          }
        }

        if (uiState.chatErrorMessage != null) {
          Surface(
            color = DangerRed.copy(alpha = 0.14f),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(
              text = uiState.chatErrorMessage,
              style = MaterialTheme.typography.bodySmall,
              color = WaTextDark,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            )
          }
        }

        // Attachment preview bar when a receipt is selected / uploading / sent / error
        ReceiptPreviewStrip(
          uploadState = uiState.receiptUploadState,
          onClear = onClearReceipt,
          onUpload = onUploadReceipt,
        )

        if (showAttachmentOptions) {
          Surface(
            color = Color.White,
            border = BorderStroke(1.dp, WaDivider),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Row(
              modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              OutlinedButton(
                onClick = {
                  showAttachmentOptions = false
                  photoPickerLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                  )
                },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = WaActionGreen),
                border = BorderStroke(1.dp, WaActionGreen),
                modifier = Modifier
                  .weight(1f)
                  .heightIn(min = 44.dp)
                  .testTag("pick_photo_receipt_button"),
              ) {
                Icon(Icons.Rounded.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Galería / Foto", maxLines = 1, overflow = TextOverflow.Ellipsis)
              }
              OutlinedButton(
                onClick = {
                  showAttachmentOptions = false
                  documentPickerLauncher.launch(arrayOf("image/jpeg", "image/png", "application/pdf"))
                },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = WaActionGreen),
                border = BorderStroke(1.dp, WaActionGreen),
                modifier = Modifier
                  .weight(1f)
                  .heightIn(min = 44.dp)
                  .testTag("pick_document_receipt_button"),
              ) {
                Icon(Icons.Rounded.Description, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("PDF / Archivo", maxLines = 1, overflow = TextOverflow.Ellipsis)
              }
            }
          }
        }

        HorizontalDivider(color = WaDivider)

        // 9. Barra de acciones rápidas (CARGAR, RETIRAR, SOPORTE)
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .background(WaComposerBg)
            .padding(horizontal = 10.dp, vertical = 8.dp),
          horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
          Button(
            onClick = {
              scope.launch { listState.animateScrollToItem(1) }
              onQuickAction(ChatQuickAction.Deposit)
            },
            colors = ButtonDefaults.buttonColors(
              containerColor = SuccessEmerald,
              contentColor = Color.White,
            ),
            shape = RoundedCornerShape(10.dp),
            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 8.dp),
            modifier = Modifier
              .weight(1f)
              .heightIn(min = 44.dp)
              .testTag("chat_quick_deposit"),
          ) {
            Text(
              text = stringResource(R.string.chat_action_deposit),
              style = MaterialTheme.typography.labelMedium,
              fontWeight = FontWeight.Bold,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis,
            )
          }

          OutlinedButton(
            onClick = { onQuickAction(ChatQuickAction.Withdraw) },
            colors = ButtonDefaults.outlinedButtonColors(
              containerColor = Color.White,
              contentColor = WaActionGreen,
            ),
            border = BorderStroke(1.dp, WaActionGreen),
            shape = RoundedCornerShape(10.dp),
            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 8.dp),
            modifier = Modifier
              .weight(1f)
              .heightIn(min = 44.dp)
              .testTag("chat_quick_withdraw"),
          ) {
            Text(
              text = stringResource(R.string.chat_action_withdraw),
              style = MaterialTheme.typography.labelMedium,
              fontWeight = FontWeight.Bold,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis,
            )
          }

          OutlinedButton(
            onClick = { onQuickAction(ChatQuickAction.Support) },
            colors = ButtonDefaults.outlinedButtonColors(
              containerColor = Color.White,
              contentColor = WaActionGreen,
            ),
            border = BorderStroke(1.dp, WaActionGreen),
            shape = RoundedCornerShape(10.dp),
            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 8.dp),
            modifier = Modifier
              .weight(1f)
              .heightIn(min = 44.dp)
              .testTag("chat_quick_support"),
          ) {
            Text(
              text = stringResource(R.string.chat_action_support),
              style = MaterialTheme.typography.labelMedium,
              fontWeight = FontWeight.Bold,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis,
            )
          }
        }

        // 11. Campo de escritura estilo WhatsApp
        val canSend = uiState.chatComposerText.isNotBlank() &&
          !uiState.isSendingMessage &&
          uiState.chatConnectionStatus == ChatConnectionStatus.Online

        Row(
          modifier = Modifier
            .fillMaxWidth()
            .background(WaComposerBg)
            .padding(start = 6.dp, end = 8.dp, bottom = 8.dp, top = 2.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
          IconButton(
            onClick = launchReceiptPicker,
            modifier = Modifier
              .size(46.dp)
              .testTag("chat_attach_button"),
          ) {
            Icon(
              imageVector = Icons.Rounded.AttachFile,
              contentDescription = stringResource(R.string.cd_attach_receipt),
              tint = WaTextSecondary,
            )
          }

          Surface(
            color = Color.White,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, WaDivider),
            modifier = Modifier
              .weight(1f)
              .heightIn(min = 46.dp),
          ) {
            Box(
              modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
              contentAlignment = Alignment.CenterStart,
            ) {
              if (uiState.chatComposerText.isEmpty()) {
                Text(
                  text = stringResource(R.string.chat_composer_placeholder),
                  style = MaterialTheme.typography.bodyMedium,
                  color = WaTextSecondary,
                  maxLines = 1,
                  overflow = TextOverflow.Ellipsis,
                )
              }
              BasicTextField(
                value = uiState.chatComposerText,
                onValueChange = onComposerChanged,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = WaTextDark),
                cursorBrush = SolidColor(WaHeaderGreen),
                maxLines = 4,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { if (canSend) onSendMessage() }),
                modifier = Modifier
                  .fillMaxWidth()
                  .testTag("chat_composer_input"),
              )
            }
          }

          Surface(
            color = if (canSend) SuccessEmerald else WaAvatarTeal.copy(alpha = 0.45f),
            shape = CircleShape,
            modifier = Modifier
              .size(46.dp)
              .clip(CircleShape)
              .clickable(enabled = canSend, onClick = onSendMessage)
              .testTag("chat_send_button"),
          ) {
            Box(contentAlignment = Alignment.Center) {
              if (uiState.isSendingMessage) {
                CircularProgressIndicator(
                  modifier = Modifier.size(18.dp),
                  strokeWidth = 2.dp,
                  color = Color.White,
                )
              } else {
                Icon(
                  imageVector = Icons.AutoMirrored.Rounded.Send,
                  contentDescription = stringResource(R.string.cd_send_message),
                  tint = Color.White,
                  modifier = Modifier.size(20.dp),
                )
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun SubtleChatPatternBackground(modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val step = 34.dp.toPx()
    val dotRadius = 1.6.dp.toPx()
    val color = Color(0xFF7D7466).copy(alpha = 0.09f)
    var y = step / 2f
    var rowIndex = 0
    while (y < size.height) {
      var x = if (rowIndex % 2 == 0) step / 2f else step
      while (x < size.width) {
        drawCircle(color = color, radius = dotRadius, center = Offset(x, y))
        x += step
      }
      y += step
      rowIndex++
    }
  }
}

@Composable
private fun WhatsAppTransferBubble(
  paymentState: AsyncState<BankTransferDetails>,
  onUploadClick: () -> Unit,
) {
  val context = LocalContext.current
  var copiedField by remember { mutableStateOf<String?>(null) }

  LaunchedEffect(copiedField) {
    if (copiedField != null) {
      delay(2000)
      copiedField = null
    }
  }

  Surface(
    color = WaBubbleIncoming,
    shape = RoundedCornerShape(
      topStart = 4.dp,
      topEnd = 16.dp,
      bottomStart = 16.dp,
      bottomEnd = 16.dp,
    ),
    shadowElevation = 1.dp,
    modifier = Modifier
      .fillMaxWidth()
      .padding(end = 18.dp)
      .testTag("whatsapp_transfer_bubble"),
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Text(
        text = stringResource(R.string.chat_transfer_intro),
        style = MaterialTheme.typography.bodyMedium,
        color = WaTextDark,
      )

      when (paymentState) {
        is AsyncState.Success -> {
          val details = paymentState.data
          if (details.minimumDepositLabel.isNotBlank()) {
            Text(
              text = "Monto mínimo de carga: ${details.minimumDepositLabel}",
              style = MaterialTheme.typography.bodySmall,
              fontWeight = FontWeight.SemiBold,
              color = WaTextDark,
            )
          }

          Surface(
            color = WaSubCardGray,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
              .fillMaxWidth()
              .testTag("payment_instructions_card"),
          ) {
            Column(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
              verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              BankTableRow(label = "CBU", value = details.cbu)
              BankTableRow(label = "Alias", value = details.alias)
              BankTableRow(label = "Titular", value = details.accountHolder)
            }
          }

          Text(
            text = stringResource(R.string.chat_bank_verify_notice),
            style = MaterialTheme.typography.labelSmall,
            color = WaTextSecondary,
          )

          CopyOutlineButton(
            text = if (copiedField == "cbu") {
              stringResource(R.string.created_copied)
            } else {
              stringResource(R.string.chat_copy_cbu)
            },
            onClick = {
              copyToClipboard(context, "CBU", details.cbu)
              copiedField = "cbu"
            },
            testTag = "copy_cbu_button",
          )

          CopyOutlineButton(
            text = if (copiedField == "alias") {
              stringResource(R.string.created_copied)
            } else {
              stringResource(R.string.chat_copy_alias)
            },
            onClick = {
              copyToClipboard(context, "Alias", details.alias)
              copiedField = "alias"
            },
            testTag = "copy_alias_button",
          )
        }

        is AsyncState.Loading -> {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(vertical = 4.dp),
          ) {
            CircularProgressIndicator(
              modifier = Modifier.size(16.dp),
              strokeWidth = 2.dp,
              color = WaHeaderGreen,
            )
            Text(
              text = "Consultando datos de transferencia…",
              style = MaterialTheme.typography.bodySmall,
              color = WaTextSecondary,
            )
          }
        }

        else -> {
          Surface(
            color = WaSubCardGray,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
              .fillMaxWidth()
              .testTag("payment_pending_card"),
          ) {
            Text(
              text = stringResource(R.string.chat_bank_pending),
              style = MaterialTheme.typography.bodySmall,
              color = WaTextSecondary,
              modifier = Modifier.padding(10.dp),
            )
          }
        }
      }

      // 8.7 Botón ancho verde SUBIR COMPROBANTE
      Button(
        onClick = onUploadClick,
        colors = ButtonDefaults.buttonColors(
          containerColor = SuccessEmerald,
          contentColor = Color.White,
        ),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
          .fillMaxWidth()
          .heightIn(min = 48.dp)
          .testTag("upload_receipt_cta"),
      ) {
        Icon(
          imageVector = Icons.Rounded.Image,
          contentDescription = null,
          modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
          text = stringResource(R.string.chat_upload_receipt_cta),
          style = MaterialTheme.typography.labelLarge,
          fontWeight = FontWeight.SemiBold,
        )
      }
    }
  }
}

@Composable
private fun BankTableRow(label: String, value: String) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(
      text = label,
      style = MaterialTheme.typography.labelMedium,
      color = WaTextSecondary,
    )
    Spacer(Modifier.width(8.dp))
    Text(
      text = value,
      style = MaterialTheme.typography.bodySmall,
      fontWeight = FontWeight.Bold,
      color = WaTextDark,
      textAlign = TextAlign.End,
      modifier = Modifier.weight(1f),
    )
  }
}

@Composable
private fun CopyOutlineButton(
  text: String,
  onClick: () -> Unit,
  testTag: String,
) {
  OutlinedButton(
    onClick = onClick,
    colors = ButtonDefaults.outlinedButtonColors(
      containerColor = Color.White,
      contentColor = WaActionGreen,
    ),
    border = BorderStroke(1.dp, WaActionGreen),
    shape = RoundedCornerShape(10.dp),
    modifier = Modifier
      .fillMaxWidth()
      .heightIn(min = 46.dp)
      .testTag(testTag),
  ) {
    Text(
      text = text,
      style = MaterialTheme.typography.labelLarge,
      fontWeight = FontWeight.SemiBold,
    )
  }
}

@Composable
private fun WhatsAppMessageBubble(message: ChatMessage) {
  val isUser = message.sender == MessageSender.User
  val bubbleColor = when (message.sender) {
    MessageSender.User -> WaBubbleOutgoing
    MessageSender.Support -> WaBubbleIncoming
    MessageSender.System -> WaBubbleIncoming
  }

  Column(
    modifier = Modifier.fillMaxWidth(),
    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
  ) {
    Surface(
      color = bubbleColor,
      shape = RoundedCornerShape(
        topStart = if (isUser) 14.dp else 4.dp,
        topEnd = if (isUser) 4.dp else 14.dp,
        bottomStart = 14.dp,
        bottomEnd = 14.dp,
      ),
      shadowElevation = 1.dp,
      modifier = Modifier.padding(
        start = if (isUser) 36.dp else 0.dp,
        end = if (isUser) 0.dp else 24.dp,
      ),
    ) {
      Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
        if (!message.attachmentName.isNullOrBlank()) {
          Text(
            text = "Comprobante: ${message.attachmentName}",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = WaActionGreen,
            modifier = Modifier.padding(bottom = 2.dp),
          )
        }
        Text(
          text = message.text,
          style = MaterialTheme.typography.bodyMedium,
          color = WaTextDark,
        )
        if (message.timestampLabel.isNotBlank()) {
          Spacer(modifier = Modifier.height(2.dp))
          Text(
            text = message.timestampLabel,
            style = MaterialTheme.typography.labelSmall,
            color = when (message.deliveryStatus) {
              MessageDeliveryStatus.Failed -> DangerRed
              MessageDeliveryStatus.Sending -> WarningAmber
              MessageDeliveryStatus.Sent -> WaTextSecondary
            },
            modifier = Modifier.align(Alignment.End),
          )
        }
      }
    }
  }
}

@Composable
private fun ReceiptPreviewStrip(
  uploadState: ReceiptUploadState,
  onClear: () -> Unit,
  onUpload: () -> Unit,
) {
  if (uploadState is ReceiptUploadState.None) return

  val attachment = when (uploadState) {
    is ReceiptUploadState.Selected -> uploadState.attachment
    is ReceiptUploadState.Uploading -> uploadState.attachment
    is ReceiptUploadState.Sent -> uploadState.attachment
    is ReceiptUploadState.Error -> uploadState.attachment
    ReceiptUploadState.None -> return
  }

  Surface(
    color = Color.White,
    border = BorderStroke(1.dp, WaDivider),
    modifier = Modifier
      .fillMaxWidth()
      .testTag("receipt_preview_bar"),
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        if (attachment.mimeType.startsWith("image/")) {
          AsyncImage(
            model = Uri.parse(attachment.uriString),
            contentDescription = attachment.displayName,
            modifier = Modifier
              .size(42.dp)
              .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop,
          )
        } else {
          Box(
            modifier = Modifier
              .size(42.dp)
              .background(WaSubCardGray, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
          ) {
            Icon(Icons.Rounded.Description, contentDescription = null, tint = WaActionGreen)
          }
        }

        Column(modifier = Modifier.weight(1f)) {
          Text(
            text = attachment.displayName,
            style = MaterialTheme.typography.labelMedium,
            color = WaTextDark,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
          )
          Text(
            text = formatByteSize(attachment.sizeBytes),
            style = MaterialTheme.typography.labelSmall,
            color = WaTextSecondary,
          )
        }

        if (uploadState !is ReceiptUploadState.Uploading) {
          IconButton(onClick = onClear) {
            Icon(
              imageVector = Icons.Rounded.Close,
              contentDescription = "Cancelar adjunto",
              tint = WaTextSecondary,
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(6.dp))

      when (uploadState) {
        is ReceiptUploadState.Selected -> {
          Button(
            onClick = onUpload,
            colors = ButtonDefaults.buttonColors(
              containerColor = SuccessEmerald,
              contentColor = Color.White,
            ),
            modifier = Modifier
              .fillMaxWidth()
              .heightIn(min = 44.dp)
              .testTag("send_receipt_button"),
          ) {
            Icon(Icons.Rounded.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Enviar comprobante")
          }
        }
        is ReceiptUploadState.Uploading -> {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            CircularProgressIndicator(
              modifier = Modifier.size(16.dp),
              strokeWidth = 2.dp,
              color = WaActionGreen,
            )
            Text("Enviando comprobante…", style = MaterialTheme.typography.bodySmall, color = WaTextSecondary)
          }
        }
        is ReceiptUploadState.Sent -> {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
          ) {
            Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = SuccessEmerald, modifier = Modifier.size(16.dp))
            Text(
              text = "Comprobante recibido por el servidor",
              style = MaterialTheme.typography.bodySmall,
              color = WaActionGreen,
            )
          }
        }
        is ReceiptUploadState.Error -> {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth(),
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp),
              modifier = Modifier.weight(1f),
            ) {
              Icon(Icons.Rounded.ErrorOutline, contentDescription = null, tint = DangerRed, modifier = Modifier.size(16.dp))
              Text(uploadState.message, style = MaterialTheme.typography.bodySmall, color = DangerRed)
            }
            TextButton(onClick = onUpload) {
              Text("Reintentar", color = WaActionGreen)
            }
          }
        }
        ReceiptUploadState.None -> Unit
      }
    }
  }
}

private fun readAttachmentMeta(contentResolver: ContentResolver, uri: Uri): ReceiptAttachment? {
  val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
  var displayName = "comprobante"
  var sizeBytes = 0L
  contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
    ?.use { cursor ->
      if (cursor.moveToFirst()) {
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (nameIndex >= 0) {
          displayName = cursor.getString(nameIndex) ?: displayName
        }
        if (sizeIndex >= 0) {
          sizeBytes = cursor.getLong(sizeIndex)
        }
      }
    }
  return ReceiptAttachment(
    uriString = uri.toString(),
    displayName = displayName,
    mimeType = mimeType,
    sizeBytes = sizeBytes,
  )
}

private fun formatByteSize(bytes: Long): String {
  if (bytes <= 0L) return "Tamaño desconocido"
  val kb = bytes / 1024.0
  return if (kb < 1024.0) {
    "${kb.toInt()} KB"
  } else {
    String.format("%.1f MB", kb / 1024.0)
  }
}
