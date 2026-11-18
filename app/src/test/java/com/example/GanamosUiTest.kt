package com.example

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import com.example.domain.model.AsyncState
import com.example.domain.model.BankTransferDetails
import com.example.domain.model.ChatConnectionStatus
import com.example.domain.model.EphemeralCredentials
import com.example.domain.model.PlayerAccount
import com.example.ui.GanamosUiState
import com.example.ui.screens.AccountCreatedScreen
import com.example.ui.screens.RegistrationScreen
import com.example.ui.screens.SupportChatOverlay
import com.example.ui.theme.GanamosTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class GanamosUiTest {

  @get:Rule
  val composeTestRule = createComposeRule()

  @Test
  fun `registration screen shows minimal layout and pending backend card when unconfigured`() {
    composeTestRule.setContent {
      GanamosTheme {
        RegistrationScreen(
          uiState = GanamosUiState(
            initialized = true,
            isBackendConfigured = false,
            registrationPendingBackend = true,
          ),
          onNameChanged = {},
          onSubmit = {},
          onRetryHealth = {},
          onEnterDemoPreview = {},
          onOpenLegal = {},
        )
      }
    }
    composeTestRule.waitForIdle()

    composeTestRule.onNodeWithText("Creá tu cuenta gratis").assertIsDisplayed()
    composeTestRule.onNodeWithText("Estamos Online 24hs!").assertIsDisplayed()
    composeTestRule.onNodeWithTag("register_name_input").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("register_submit_button").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("backend_pending_card").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("demo_preview_button").performScrollTo().assertIsDisplayed()
  }

  @Test
  fun `account created screen shows credentials only when confirmed`() {
    composeTestRule.setContent {
      GanamosTheme {
        AccountCreatedScreen(
          account = PlayerAccount(id = "u-1", username = "valentina_ok", isDemo = false),
          credentials = EphemeralCredentials(
            username = "valentina_ok",
            temporaryPassword = "clave-unica-1",
          ),
          onContinue = {},
        )
      }
    }
    composeTestRule.waitForIdle()

    composeTestRule.onNodeWithText("¡Cuenta creada!").assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_username_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_password_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("continue_to_account_button").assertIsDisplayed()
  }

  @Test
  fun `demo account created screen shows demo badge and hides password row`() {
    composeTestRule.setContent {
      GanamosTheme {
        AccountCreatedScreen(
          account = PlayerAccount(id = "demo-preview", username = "visitante", isDemo = true),
          credentials = EphemeralCredentials(username = "visitante", temporaryPassword = null),
          onContinue = {},
        )
      }
    }
    composeTestRule.waitForIdle()

    composeTestRule.onNodeWithTag("demo_created_pill").assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_username_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_password_button").assertDoesNotExist()
  }

  @Test
  fun `whatsapp style chat overlay displays configured bank details, quick actions, and composer`() {
    composeTestRule.setContent {
      GanamosTheme {
        SupportChatOverlay(
          uiState = GanamosUiState(
            initialized = true,
            isChatOpen = true,
            chatConnectionStatus = ChatConnectionStatus.Online,
            paymentDetailsState = AsyncState.Success(
              BankTransferDetails(
                cbu = "0000003100012345678901",
                alias = "GANAMOS.TEST.ALIAS",
                accountHolder = "OPERADOR VERIFICADO SA",
                minimumDepositLabel = "$3.000",
              )
            ),
          ),
          onMinimize = {},
          onQuickAction = {},
          onComposerChanged = {},
          onSendMessage = {},
          onReceiptSelected = {},
          onClearReceipt = {},
          onUploadReceipt = {},
        )
      }
    }
    composeTestRule.waitForIdle()

    composeTestRule.onNodeWithTag("whatsapp_chat_container").assertIsDisplayed()
    composeTestRule.onNodeWithText("Chat").assertIsDisplayed()
    composeTestRule.onNodeWithText("en línea").assertIsDisplayed()
    composeTestRule.onNodeWithText("Conectado. Escribinos y te respondemos.").assertIsDisplayed()
    composeTestRule.onNodeWithTag("payment_instructions_card").assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_cbu_button").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("copy_alias_button").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("upload_receipt_cta").performScrollTo().assertIsDisplayed()
    composeTestRule.onNodeWithTag("chat_quick_deposit").assertIsDisplayed()
    composeTestRule.onNodeWithTag("chat_quick_withdraw").assertIsDisplayed()
    composeTestRule.onNodeWithTag("chat_quick_support").assertIsDisplayed()
    composeTestRule.onNodeWithTag("chat_composer_input").assertIsDisplayed()
  }
}
