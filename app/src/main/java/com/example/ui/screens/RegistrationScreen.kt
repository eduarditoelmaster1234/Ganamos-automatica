package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.config.AppConfig
import com.example.domain.model.LegalDocumentType
import com.example.domain.model.NameValidationError
import com.example.ui.GanamosUiState
import com.example.ui.components.GanamosBackground
import com.example.ui.components.GanamosEmblemBadge
import com.example.ui.components.GanamosPrimaryButton
import com.example.ui.components.GanamosSecondaryButton
import com.example.ui.theme.BgElevated
import com.example.ui.theme.BgVoid
import com.example.ui.theme.BorderFocus
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.DangerRed
import com.example.ui.theme.PrimarySoft
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSubtle
import com.example.ui.theme.WarningAmber

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RegistrationScreen(
  uiState: GanamosUiState,
  onNameChanged: (String) -> Unit,
  onSubmit: () -> Unit,
  onRetryHealth: () -> Unit,
  onEnterDemoPreview: () -> Unit,
  onOpenLegal: (LegalDocumentType) -> Unit,
) {
  val nameErrorText = when (uiState.nameError) {
    NameValidationError.Empty -> stringResource(R.string.register_error_empty)
    NameValidationError.TooShort -> stringResource(R.string.register_error_short)
    NameValidationError.TooLong -> stringResource(R.string.register_error_long)
    NameValidationError.InvalidCharacters -> stringResource(R.string.register_error_chars)
    null -> null
  }

  GanamosBackground {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .safeDrawingPadding()
        .imePadding()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp, vertical = 20.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Column(
        modifier = Modifier.widthIn(max = 440.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Surface(
          color = BgElevated.copy(alpha = 0.94f),
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, BorderSubtle),
          modifier = Modifier.fillMaxWidth(),
        ) {
          Column(
            modifier = Modifier
              .fillMaxWidth()
              .padding(horizontal = 22.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
          ) {
            // 1. Original Ganamos Logo / Emblem
            GanamosEmblemBadge(size = 76.dp)
            Spacer(modifier = Modifier.height(16.dp))

            // 2. Title: "Creá tu cuenta gratis"
            Text(
              text = buildAnnotatedString {
                append("Creá tu ")
                withStyle(SpanStyle(color = PrimarySoft)) {
                  append("cuenta gratis")
                }
              },
              style = MaterialTheme.typography.headlineMedium,
              color = TextPrimary,
              textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(6.dp))

            // 3. Subtitle: "Estamos Online 24hs!"
            Text(
              text = if (uiState.isOnline) {
                stringResource(R.string.register_subtitle)
              } else {
                "Sin conexión a internet"
              },
              style = MaterialTheme.typography.bodyLarge,
              color = if (uiState.isOnline) TextMuted else WarningAmber,
              textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(22.dp))

            // 4. Text field for name or nickname
            OutlinedTextField(
              value = uiState.nameInput,
              onValueChange = onNameChanged,
              enabled = !uiState.isSubmittingRegistration,
              singleLine = true,
              isError = nameErrorText != null,
              placeholder = {
                Text(
                  text = stringResource(R.string.register_name_placeholder),
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
              keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Words,
                imeAction = ImeAction.Done,
              ),
              keyboardActions = KeyboardActions(onDone = { onSubmit() }),
              modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Nombre o apodo" }
                .testTag("register_name_input"),
            )

            AnimatedVisibility(
              visible = nameErrorText != null,
              enter = fadeIn(),
              exit = fadeOut(),
            ) {
              Row(
                modifier = Modifier
                  .fillMaxWidth()
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
                  text = nameErrorText.orEmpty(),
                  style = MaterialTheme.typography.bodySmall,
                  color = DangerRed,
                )
              }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 5. Violet Button: "CREAR MI CUENTA · +18"
            GanamosPrimaryButton(
              text = if (uiState.isSubmittingRegistration) {
                stringResource(R.string.register_cta_loading)
              } else {
                stringResource(R.string.register_cta)
              },
              onClick = onSubmit,
              enabled = !uiState.isSubmittingRegistration && uiState.isBackendConfigured,
              loading = uiState.isSubmittingRegistration,
              modifier = Modifier.testTag("register_submit_button"),
            )

            AnimatedVisibility(
              visible = uiState.registrationErrorMessage != null,
              enter = fadeIn(),
              exit = fadeOut(),
            ) {
              Surface(
                color = DangerRed.copy(alpha = 0.14f),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, DangerRed.copy(alpha = 0.4f)),
                modifier = Modifier
                  .fillMaxWidth()
                  .padding(top = 12.dp)
                  .testTag("registration_error_banner"),
              ) {
                Column(modifier = Modifier.padding(12.dp)) {
                  Text(
                    text = uiState.registrationErrorMessage.orEmpty(),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextPrimary,
                  )
                  if (uiState.isBackendConfigured) {
                    TextButton(
                      onClick = onRetryHealth,
                      modifier = Modifier.padding(top = 4.dp),
                    ) {
                      Icon(
                        imageVector = Icons.Rounded.Refresh,
                        contentDescription = null,
                        tint = PrimarySoft,
                        modifier = Modifier.size(16.dp),
                      )
                      Text(
                        text = " Reintentar",
                        style = MaterialTheme.typography.labelMedium,
                        color = PrimarySoft,
                      )
                    }
                  }
                }
              }
            }

            if (uiState.registrationPendingBackend) {
              Spacer(modifier = Modifier.height(14.dp))
              Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, WarningAmber.copy(alpha = 0.35f)),
                modifier = Modifier
                  .fillMaxWidth()
                  .testTag("backend_pending_card"),
              ) {
                Column(modifier = Modifier.padding(14.dp)) {
                  Text(
                    text = stringResource(R.string.register_backend_pending_title),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = WarningAmber,
                  )
                  Spacer(modifier = Modifier.height(4.dp))
                  Text(
                    text = stringResource(R.string.register_backend_pending_body),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted,
                  )
                  Spacer(modifier = Modifier.height(10.dp))
                  GanamosSecondaryButton(
                    text = stringResource(R.string.register_demo_cta),
                    leadingIcon = Icons.Rounded.PlayArrow,
                    onClick = onEnterDemoPreview,
                    modifier = Modifier.testTag("demo_preview_button"),
                  )
                }
              }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 6. Discreet security caption
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              Icon(
                imageVector = Icons.Rounded.Lock,
                contentDescription = null,
                tint = TextSubtle,
                modifier = Modifier.size(14.dp),
              )
              Text(
                text = stringResource(R.string.register_security_caption),
                style = MaterialTheme.typography.bodySmall,
                color = TextSubtle,
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 7. Minimal Legal Footer
        FlowRow(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
          verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
          LegalLinkChip(
            text = stringResource(R.string.legal_privacy),
            onClick = { onOpenLegal(LegalDocumentType.Privacy) },
            testTag = "legal_privacy_link",
          )
          LegalLinkChip(
            text = stringResource(R.string.legal_terms),
            onClick = { onOpenLegal(LegalDocumentType.Terms) },
            testTag = "legal_terms_link",
          )
          LegalLinkChip(
            text = stringResource(R.string.legal_cookies),
            onClick = { onOpenLegal(LegalDocumentType.Cookies) },
            testTag = "legal_cookies_link",
          )
          LegalLinkChip(
            text = stringResource(R.string.legal_responsible),
            onClick = { onOpenLegal(LegalDocumentType.ResponsibleGaming) },
            testTag = "legal_responsible_link",
          )
        }

        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = AppConfig.jurisdictionNotice,
          style = MaterialTheme.typography.bodySmall,
          color = TextSubtle,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 12.dp),
        )
      }
    }
  }
}

@Composable
private fun LegalLinkChip(
  text: String,
  onClick: () -> Unit,
  testTag: String,
) {
  TextButton(
    onClick = onClick,
    modifier = Modifier
      .minimumInteractiveComponentSize()
      .testTag(testTag),
  ) {
    Text(
      text = text,
      style = MaterialTheme.typography.labelMedium,
      color = TextMuted,
      textDecoration = TextDecoration.Underline,
    )
  }
}
