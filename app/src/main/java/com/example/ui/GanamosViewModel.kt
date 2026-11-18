package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.config.AppConfig
import com.example.data.preferences.SessionPreferences
import com.example.data.remote.NetworkMonitor
import com.example.data.repository.GanamosRepository
import com.example.domain.model.AsyncState
import com.example.domain.model.AttributionParams
import com.example.domain.model.BankTransferDetails
import com.example.domain.model.ChatConnectionStatus
import com.example.domain.model.ChatMessage
import com.example.domain.model.EphemeralCredentials
import com.example.domain.model.LegalDocumentType
import com.example.domain.model.MessageDeliveryStatus
import com.example.domain.model.MessageSender
import com.example.domain.model.NameValidationError
import com.example.domain.model.NameValidationResult
import com.example.domain.model.NameValidator
import com.example.domain.model.NotificationPermissionStatus
import com.example.domain.model.PlayerAccount
import com.example.domain.model.ReceiptAttachment
import com.example.domain.model.ReceiptUploadState
import com.example.domain.model.RegistrationOutcome
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AppDestination {
  Register,
  AccountCreated,
  Platform,
}

enum class ChatQuickAction {
  Deposit,
  Withdraw,
  Support,
}

data class GanamosUiState(
  val initialized: Boolean = false,
  val destination: AppDestination = AppDestination.Register,
  val isOnline: Boolean = true,
  val isBackendConfigured: Boolean = AppConfig.isBackendConfigured,
  val backendReachable: Boolean? = null,
  val clientId: String = "",
  val attribution: AttributionParams = AttributionParams(),

  // Registration form
  val nameInput: String = "",
  val nameError: NameValidationError? = null,
  val isAgeConfirmed: Boolean = false,
  val ageErrorVisible: Boolean = false,
  val isSubmittingRegistration: Boolean = false,
  val registrationErrorMessage: String? = null,
  val registrationPendingBackend: Boolean = !AppConfig.isBackendConfigured,

  // Active session & ephemeral confirmation
  val activeAccount: PlayerAccount? = null,
  val ephemeralCredentials: EphemeralCredentials? = null,

  // Chat
  val isChatOpen: Boolean = false,
  val isChatMinimized: Boolean = false,
  val unreadChatCount: Int = 0,
  val isCredentialPillMinimized: Boolean = false,
  val chatConnectionStatus: ChatConnectionStatus = ChatConnectionStatus.NotConfigured,
  val chatMessages: List<ChatMessage> = emptyList(),
  val chatComposerText: String = "",
  val isSendingMessage: Boolean = false,
  val chatErrorMessage: String? = null,
  val paymentDetailsState: AsyncState<BankTransferDetails> = AsyncState.Idle,
  val receiptUploadState: ReceiptUploadState = ReceiptUploadState.None,

  // Overlays / Sheets
  val activeLegalDocument: LegalDocumentType? = null,
  val isNotificationsSheetOpen: Boolean = false,
  val notificationStatus: NotificationPermissionStatus = NotificationPermissionStatus.Default,
  val notificationsDismissed: Boolean = false,
)

class GanamosViewModel(
  private val repository: GanamosRepository,
  private val preferencesStore: SessionPreferences,
  private val networkMonitor: NetworkMonitor,
  initialAttribution: AttributionParams = AttributionParams(),
) : ViewModel() {

  private val _uiState = MutableStateFlow(
    GanamosUiState(
      isOnline = networkMonitor.isCurrentlyOnline(),
      isBackendConfigured = repository.isBackendConfigured,
      registrationPendingBackend = !repository.isBackendConfigured,
      attribution = initialAttribution,
    )
  )
  val uiState: StateFlow<GanamosUiState> = _uiState.asStateFlow()

  init {
    bootstrapSession()
    observeConnectivity()
  }

  private fun bootstrapSession() {
    viewModelScope.launch {
      val clientId = preferencesStore.getOrCreateClientId()
      val snapshot = preferencesStore.preferencesFlow.first()
      val restoredDestination = if (snapshot.account != null && snapshot.onboardingCompleted) {
        AppDestination.Platform
      } else {
        AppDestination.Register
      }
      val shouldAutoOpenChat =
        restoredDestination == AppDestination.Platform && !snapshot.chatMinimized
      _uiState.update { state ->
        state.copy(
          initialized = true,
          clientId = clientId,
          activeAccount = snapshot.account,
          destination = restoredDestination,
          isChatOpen = shouldAutoOpenChat,
          isChatMinimized = snapshot.chatMinimized,
          notificationsDismissed = snapshot.notificationsDismissed,
        )
      }
      refreshBackendStatus()
      if (shouldAutoOpenChat) {
        loadChatAndPaymentInfo()
      }
    }
  }

  private fun observeConnectivity() {
    viewModelScope.launch {
      networkMonitor.isOnlineFlow.collect { online ->
        _uiState.update { state ->
          val updatedChatStatus = when {
            !repository.isBackendConfigured -> ChatConnectionStatus.NotConfigured
            !online -> ChatConnectionStatus.Offline
            state.backendReachable == true && state.activeAccount?.isDemo != true ->
              ChatConnectionStatus.Online
            else -> state.chatConnectionStatus
          }
          state.copy(
            isOnline = online,
            chatConnectionStatus = updatedChatStatus,
          )
        }
      }
    }
  }

  fun refreshBackendStatus() {
    viewModelScope.launch {
      if (!repository.isBackendConfigured) {
        _uiState.update {
          it.copy(
            isBackendConfigured = false,
            backendReachable = false,
            registrationPendingBackend = true,
            chatConnectionStatus = ChatConnectionStatus.NotConfigured,
          )
        }
        return@launch
      }

      when (val health = repository.checkBackendHealth()) {
        is AsyncState.Success -> {
          _uiState.update {
            it.copy(
              isBackendConfigured = true,
              backendReachable = true,
              registrationPendingBackend = false,
              chatConnectionStatus = if (it.activeAccount?.isDemo == true) {
                ChatConnectionStatus.NotConfigured
              } else if (health.data.chatEnabled) {
                ChatConnectionStatus.Online
              } else {
                ChatConnectionStatus.NotConfigured
              },
            )
          }
        }
        is AsyncState.Offline -> {
          _uiState.update {
            it.copy(
              backendReachable = false,
              chatConnectionStatus = ChatConnectionStatus.Offline,
            )
          }
        }
        is AsyncState.NotConfigured -> {
          _uiState.update {
            it.copy(
              isBackendConfigured = false,
              backendReachable = false,
              registrationPendingBackend = true,
              chatConnectionStatus = ChatConnectionStatus.NotConfigured,
            )
          }
        }
        else -> {
          _uiState.update {
            it.copy(
              backendReachable = false,
              chatConnectionStatus = ChatConnectionStatus.Offline,
            )
          }
        }
      }
    }
  }

  fun onNameChanged(newValue: String) {
    _uiState.update {
      it.copy(
        nameInput = newValue,
        nameError = null,
        registrationErrorMessage = null,
      )
    }
  }

  fun onAgeConfirmedChanged(confirmed: Boolean) {
    _uiState.update {
      it.copy(
        isAgeConfirmed = confirmed,
        ageErrorVisible = if (confirmed) false else it.ageErrorVisible,
      )
    }
  }

  fun submitRegistration() {
    val current = _uiState.value
    if (current.isSubmittingRegistration) return

    val validation = NameValidator.validate(current.nameInput)
    val nameError = (validation as? NameValidationResult.Invalid)?.errorResKey

    if (nameError != null) {
      _uiState.update {
        it.copy(nameError = nameError)
      }
      return
    }

    val normalizedName = (validation as NameValidationResult.Valid).normalized
    if (!repository.isBackendConfigured) {
      _uiState.update {
        it.copy(
          registrationPendingBackend = true,
          registrationErrorMessage =
            "El servidor de registro todavía no está configurado. Podés explorar el modo demostración.",
        )
      }
      return
    }

    viewModelScope.launch {
      _uiState.update {
        it.copy(
          isSubmittingRegistration = true,
          registrationErrorMessage = null,
        )
      }
      val clientId = _uiState.value.clientId.ifBlank { preferencesStore.getOrCreateClientId() }
      when (
        val outcome = repository.registerPlayer(
          clientId = clientId,
          normalizedName = normalizedName,
          attribution = _uiState.value.attribution,
        )
      ) {
        is RegistrationOutcome.Confirmed -> {
          preferencesStore.saveAccountSession(outcome.account, onboardingCompleted = false)
          _uiState.update {
            it.copy(
              isSubmittingRegistration = false,
              activeAccount = outcome.account,
              ephemeralCredentials = outcome.credentials,
              destination = AppDestination.AccountCreated,
              registrationErrorMessage = null,
            )
          }
        }
        is RegistrationOutcome.NotConfigured -> {
          _uiState.update {
            it.copy(
              isSubmittingRegistration = false,
              registrationPendingBackend = true,
              registrationErrorMessage = outcome.reason,
            )
          }
        }
        is RegistrationOutcome.Offline -> {
          _uiState.update {
            it.copy(
              isSubmittingRegistration = false,
              registrationErrorMessage = outcome.message,
            )
          }
        }
        is RegistrationOutcome.Failed -> {
          _uiState.update {
            it.copy(
              isSubmittingRegistration = false,
              registrationErrorMessage = outcome.message,
            )
          }
        }
        is RegistrationOutcome.DemoPreview -> Unit
      }
    }
  }

  fun enterDemoPreview() {
    val current = _uiState.value
    val validation = NameValidator.validate(current.nameInput)
    val previewName = when (validation) {
      is NameValidationResult.Valid -> validation.normalized
      is NameValidationResult.Invalid -> "visitante"
    }
    val demoAccount = PlayerAccount(
      id = "demo-preview",
      username = previewName,
      isDemo = true,
    )
    viewModelScope.launch {
      preferencesStore.saveAccountSession(demoAccount, onboardingCompleted = false)
      _uiState.update {
        it.copy(
          activeAccount = demoAccount,
          ephemeralCredentials = EphemeralCredentials(
            username = previewName,
            temporaryPassword = null,
          ),
          destination = AppDestination.AccountCreated,
          registrationErrorMessage = null,
          chatConnectionStatus = ChatConnectionStatus.NotConfigured,
        )
      }
    }
  }

  fun continueToPlatform() {
    val account = _uiState.value.activeAccount ?: return
    viewModelScope.launch {
      preferencesStore.saveAccountSession(account, onboardingCompleted = true)
      preferencesStore.setChatMinimized(false)
      _uiState.update {
        it.copy(
          destination = AppDestination.Platform,
          isChatOpen = true,
          isChatMinimized = false,
          unreadChatCount = 0,
        )
      }
      loadChatAndPaymentInfo()
    }
  }

  fun setCredentialPillMinimized(minimized: Boolean) {
    _uiState.update { it.copy(isCredentialPillMinimized = minimized) }
  }

  fun openChat() {
    viewModelScope.launch {
      preferencesStore.setChatMinimized(false)
      val shouldRefresh = _uiState.value.paymentDetailsState is AsyncState.Idle ||
        _uiState.value.chatConnectionStatus != ChatConnectionStatus.Online
      _uiState.update {
        it.copy(
          isChatOpen = true,
          isChatMinimized = false,
          unreadChatCount = 0,
          chatErrorMessage = null,
        )
      }
      if (shouldRefresh) {
        loadChatAndPaymentInfo()
      }
    }
  }

  fun minimizeChat() {
    viewModelScope.launch {
      preferencesStore.setChatMinimized(true)
      _uiState.update {
        it.copy(
          isChatOpen = false,
          isChatMinimized = true,
        )
      }
    }
  }

  fun closeChat() {
    viewModelScope.launch {
      preferencesStore.setChatMinimized(false)
      _uiState.update {
        it.copy(
          isChatOpen = false,
          isChatMinimized = false,
        )
      }
    }
  }

  fun loadChatAndPaymentInfo() {
    viewModelScope.launch {
      val state = _uiState.value
      val isDemo = state.activeAccount?.isDemo == true

      val paymentState = if (isDemo) {
        AsyncState.NotConfigured(
          "Los datos de transferencia no se muestran en modo demostración."
        )
      } else {
        _uiState.update { it.copy(paymentDetailsState = AsyncState.Loading) }
        repository.getPublicPaymentInstructions()
      }

      if (!repository.isBackendConfigured || isDemo) {
        _uiState.update {
          it.copy(
            chatConnectionStatus = ChatConnectionStatus.NotConfigured,
            paymentDetailsState = paymentState,
          )
        }
        return@launch
      }

      if (!networkMonitor.isCurrentlyOnline()) {
        _uiState.update {
          it.copy(
            chatConnectionStatus = ChatConnectionStatus.Offline,
            paymentDetailsState = paymentState,
          )
        }
        return@launch
      }

      _uiState.update {
        it.copy(
          chatConnectionStatus = ChatConnectionStatus.Connecting,
          paymentDetailsState = paymentState,
        )
      }

      val playerId = state.activeAccount?.id.orEmpty()
      val clientId = state.clientId
      if (playerId.isBlank() || clientId.isBlank()) {
        _uiState.update {
          it.copy(chatConnectionStatus = ChatConnectionStatus.NotConfigured)
        }
        return@launch
      }

      when (val history = repository.getChatHistory(clientId = clientId, playerId = playerId)) {
        is AsyncState.Success -> {
          _uiState.update {
            it.copy(
              chatConnectionStatus = ChatConnectionStatus.Online,
              chatMessages = history.data,
              chatErrorMessage = null,
            )
          }
        }
        is AsyncState.Offline -> {
          _uiState.update {
            it.copy(
              chatConnectionStatus = ChatConnectionStatus.Offline,
              chatErrorMessage = history.message,
            )
          }
        }
        is AsyncState.NotConfigured -> {
          _uiState.update {
            it.copy(
              chatConnectionStatus = ChatConnectionStatus.NotConfigured,
              chatErrorMessage = history.message,
            )
          }
        }
        is AsyncState.Unauthorized -> {
          _uiState.update {
            it.copy(
              chatConnectionStatus = ChatConnectionStatus.Offline,
              chatErrorMessage = history.message,
            )
          }
        }
        is AsyncState.Error -> {
          _uiState.update {
            it.copy(
              chatConnectionStatus = ChatConnectionStatus.Offline,
              chatErrorMessage = history.message,
            )
          }
        }
        else -> Unit
      }
    }
  }

  fun onChatComposerChanged(text: String) {
    _uiState.update { it.copy(chatComposerText = text) }
  }

  fun triggerQuickAction(action: ChatQuickAction) {
    val state = _uiState.value
    val promptText = when (action) {
      ChatQuickAction.Deposit -> "Quiero consultar los pasos para cargar saldo."
      ChatQuickAction.Withdraw -> "Quiero consultar los requisitos para retirar."
      ChatQuickAction.Support -> "Necesito ayuda de soporte."
    }

    if (state.chatConnectionStatus == ChatConnectionStatus.Online &&
      state.activeAccount?.isDemo != true &&
      repository.isBackendConfigured
    ) {
      sendChatText(promptText, topic = action.name.lowercase())
      return
    }

    val guidance = when (action) {
      ChatQuickAction.Deposit -> {
        val bankState = state.paymentDetailsState
        if (bankState is AsyncState.Success && bankState.data.isConfigured) {
          "Para cargar, verificá los datos vigentes en la tarjeta superior (Titular: ${bankState.data.accountHolder}) y luego adjuntá tu comprobante cuando el servidor de soporte esté en línea."
        } else {
          "Las instrucciones de carga estarán disponibles en cuanto el operador configure los datos bancarios y el canal de soporte en línea."
        }
      }
      ChatQuickAction.Withdraw ->
        "Para solicitar un retiro, soporte te pedirá confirmar tu usuario y un CBU/CVU o alias a tu nombre. Nunca compartas contraseñas ni códigos de verificación."
      ChatQuickAction.Support ->
        "El canal de soporte en vivo todavía no está conectado en este entorno. Podés revisar los avisos legales o intentar nuevamente cuando el servidor esté disponible."
    }

    val infoMessage = ChatMessage(
      id = "local-info-${System.currentTimeMillis()}",
      sender = MessageSender.System,
      text = guidance,
      timestampLabel = "Información",
      deliveryStatus = MessageDeliveryStatus.Sent,
    )
    _uiState.update {
      it.copy(chatMessages = it.chatMessages + infoMessage)
    }
  }

  fun sendChatText(customText: String? = null, topic: String? = null) {
    val state = _uiState.value
    val text = (customText ?: state.chatComposerText).trim()
    if (text.isEmpty() || state.isSendingMessage) return

    if (!repository.isBackendConfigured || state.activeAccount?.isDemo == true) {
      _uiState.update {
        it.copy(
          chatErrorMessage = "El chat en vivo no está disponible sin un servidor configurado."
        )
      }
      return
    }

    if (!networkMonitor.isCurrentlyOnline()) {
      _uiState.update {
        it.copy(
          chatConnectionStatus = ChatConnectionStatus.Offline,
          chatErrorMessage = "Sin conexión. Revisá tu red para enviar el mensaje.",
        )
      }
      return
    }

    val playerId = state.activeAccount?.id.orEmpty()
    val clientId = state.clientId
    val tempId = "pending-${System.currentTimeMillis()}"
    val optimistic = ChatMessage(
      id = tempId,
      sender = MessageSender.User,
      text = text,
      timestampLabel = "Enviando…",
      deliveryStatus = MessageDeliveryStatus.Sending,
    )

    viewModelScope.launch {
      _uiState.update {
        it.copy(
          isSendingMessage = true,
          chatComposerText = if (customText == null) "" else it.chatComposerText,
          chatMessages = it.chatMessages + optimistic,
          chatErrorMessage = null,
        )
      }

      when (
        val result = repository.sendChatMessage(
          clientId = clientId,
          playerId = playerId,
          text = text,
          topic = topic,
        )
      ) {
        is AsyncState.Success -> {
          _uiState.update { current ->
            current.copy(
              isSendingMessage = false,
              chatMessages = current.chatMessages.map { msg ->
                if (msg.id == tempId) result.data else msg
              },
            )
          }
        }
        is AsyncState.Offline -> {
          _uiState.update { current ->
            current.copy(
              isSendingMessage = false,
              chatConnectionStatus = ChatConnectionStatus.Offline,
              chatErrorMessage = result.message,
              chatMessages = current.chatMessages.map { msg ->
                if (msg.id == tempId) msg.copy(
                  timestampLabel = "Sin conexión",
                  deliveryStatus = MessageDeliveryStatus.Failed,
                ) else msg
              },
            )
          }
        }
        is AsyncState.Error -> {
          _uiState.update { current ->
            current.copy(
              isSendingMessage = false,
              chatErrorMessage = result.message,
              chatMessages = current.chatMessages.map { msg ->
                if (msg.id == tempId) msg.copy(
                  timestampLabel = "Error",
                  deliveryStatus = MessageDeliveryStatus.Failed,
                ) else msg
              },
            )
          }
        }
        is AsyncState.NotConfigured -> {
          _uiState.update { current ->
            current.copy(
              isSendingMessage = false,
              chatConnectionStatus = ChatConnectionStatus.NotConfigured,
              chatErrorMessage = result.message,
              chatMessages = current.chatMessages.filterNot { it.id == tempId },
            )
          }
        }
        is AsyncState.Unauthorized -> {
          _uiState.update { current ->
            current.copy(
              isSendingMessage = false,
              chatErrorMessage = result.message,
              chatMessages = current.chatMessages.filterNot { it.id == tempId },
            )
          }
        }
        else -> Unit
      }
    }
  }

  fun onReceiptSelected(attachment: ReceiptAttachment) {
    val allowedMimes = setOf("image/jpeg", "image/png", "image/webp", "application/pdf")
    if (attachment.mimeType !in allowedMimes) {
      _uiState.update {
        it.copy(
          receiptUploadState = ReceiptUploadState.Error(
            attachment = attachment,
            message = "Formato no compatible. Usá JPG, PNG o PDF.",
          )
        )
      }
      return
    }
    if (attachment.sizeBytes > 10 * 1024 * 1024) {
      _uiState.update {
        it.copy(
          receiptUploadState = ReceiptUploadState.Error(
            attachment = attachment,
            message = "El archivo supera el límite de 10 MB.",
          )
        )
      }
      return
    }
    _uiState.update {
      it.copy(receiptUploadState = ReceiptUploadState.Selected(attachment))
    }
  }

  fun clearSelectedReceipt() {
    _uiState.update { it.copy(receiptUploadState = ReceiptUploadState.None) }
  }

  fun uploadSelectedReceipt() {
    val currentUpload = _uiState.value.receiptUploadState
    val attachment = when (currentUpload) {
      is ReceiptUploadState.Selected -> currentUpload.attachment
      is ReceiptUploadState.Error -> currentUpload.attachment
      else -> return
    }

    val state = _uiState.value
    if (!repository.isBackendConfigured || state.activeAccount?.isDemo == true) {
      _uiState.update {
        it.copy(
          receiptUploadState = ReceiptUploadState.Error(
            attachment = attachment,
            message = "El envío de comprobantes requiere un servidor configurado.",
          )
        )
      }
      return
    }

    val playerId = state.activeAccount?.id.orEmpty()
    val clientId = state.clientId

    viewModelScope.launch {
      _uiState.update {
        it.copy(receiptUploadState = ReceiptUploadState.Uploading(attachment))
      }
      when (
        val result = repository.uploadReceipt(
          clientId = clientId,
          playerId = playerId,
          attachment = attachment,
        )
      ) {
        is AsyncState.Success -> {
          val confirmationMsg = ChatMessage(
            id = "receipt-${System.currentTimeMillis()}",
            sender = MessageSender.User,
            text = "Comprobante enviado para revisión",
            timestampLabel = "Recibido por el servidor",
            deliveryStatus = MessageDeliveryStatus.Sent,
            attachmentName = attachment.displayName,
          )
          _uiState.update {
            it.copy(
              receiptUploadState = ReceiptUploadState.Sent(attachment, result.data),
              chatMessages = it.chatMessages + confirmationMsg,
            )
          }
        }
        is AsyncState.Offline -> {
          _uiState.update {
            it.copy(
              receiptUploadState = ReceiptUploadState.Error(attachment, result.message)
            )
          }
        }
        is AsyncState.NotConfigured -> {
          _uiState.update {
            it.copy(
              receiptUploadState = ReceiptUploadState.Error(attachment, result.message)
            )
          }
        }
        is AsyncState.Unauthorized -> {
          _uiState.update {
            it.copy(
              receiptUploadState = ReceiptUploadState.Error(attachment, result.message)
            )
          }
        }
        is AsyncState.Error -> {
          _uiState.update {
            it.copy(
              receiptUploadState = ReceiptUploadState.Error(attachment, result.message)
            )
          }
        }
        else -> Unit
      }
    }
  }

  fun openLegalDocument(type: LegalDocumentType) {
    _uiState.update { it.copy(activeLegalDocument = type) }
  }

  fun closeLegalDocument() {
    _uiState.update { it.copy(activeLegalDocument = null) }
  }

  fun openNotificationsSheet(status: NotificationPermissionStatus) {
    _uiState.update {
      it.copy(
        isNotificationsSheetOpen = true,
        notificationStatus = status,
      )
    }
  }

  fun closeNotificationsSheet() {
    _uiState.update { it.copy(isNotificationsSheetOpen = false) }
  }

  fun updateNotificationStatus(status: NotificationPermissionStatus) {
    _uiState.update { it.copy(notificationStatus = status) }
  }

  fun dismissNotificationsPrompt() {
    viewModelScope.launch {
      preferencesStore.setNotificationsDismissed(true)
      _uiState.update {
        it.copy(
          isNotificationsSheetOpen = false,
          notificationsDismissed = true,
        )
      }
    }
  }

  fun signOut() {
    viewModelScope.launch {
      preferencesStore.clearSession()
      _uiState.update {
        it.copy(
          activeAccount = null,
          ephemeralCredentials = null,
          destination = AppDestination.Register,
          isChatOpen = false,
          isChatMinimized = false,
          chatMessages = emptyList(),
          receiptUploadState = ReceiptUploadState.None,
          nameInput = "",
          nameError = null,
          registrationErrorMessage = null,
        )
      }
    }
  }

  class Factory(
    private val repository: GanamosRepository,
    private val preferencesStore: SessionPreferences,
    private val networkMonitor: NetworkMonitor,
    private val attribution: AttributionParams = AttributionParams(),
  ) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
      return GanamosViewModel(
        repository = repository,
        preferencesStore = preferencesStore,
        networkMonitor = networkMonitor,
        initialAttribution = attribution,
      ) as T
    }
  }
}
