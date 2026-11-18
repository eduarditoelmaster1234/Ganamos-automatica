package com.example.domain.model

data class AttributionParams(
  val utmSource: String? = null,
  val utmCampaign: String? = null,
  val fbclid: String? = null,
)

data class PlayerAccount(
  val id: String,
  val username: String,
  val isDemo: Boolean = false,
  val createdAtIso: String? = null,
)

/**
 * Held strictly in memory while the user views the confirmation screen.
 * Never persisted in DataStore or SharedPreferences.
 */
data class EphemeralCredentials(
  val username: String,
  val temporaryPassword: String? = null,
)

sealed interface AsyncState<out T> {
  data object Idle : AsyncState<Nothing>
  data object Loading : AsyncState<Nothing>
  data class Success<T>(val data: T) : AsyncState<T>
  data class Error(val message: String, val retryable: Boolean = true) : AsyncState<Nothing>
  data class Offline(val message: String) : AsyncState<Nothing>
  data class NotConfigured(val message: String) : AsyncState<Nothing>
  data class Unauthorized(val message: String) : AsyncState<Nothing>
}

sealed interface RegistrationOutcome {
  data class Confirmed(
    val account: PlayerAccount,
    val credentials: EphemeralCredentials,
  ) : RegistrationOutcome

  data class DemoPreview(
    val account: PlayerAccount,
  ) : RegistrationOutcome

  data class NotConfigured(val reason: String) : RegistrationOutcome
  data class Offline(val message: String) : RegistrationOutcome
  data class Failed(val message: String) : RegistrationOutcome
}

data class BankTransferDetails(
  val cbu: String,
  val alias: String,
  val accountHolder: String,
  val minimumDepositLabel: String,
) {
  val isConfigured: Boolean
    get() = cbu.isNotBlank() && alias.isNotBlank() && accountHolder.isNotBlank()
}

enum class ChatConnectionStatus {
  Online,
  Connecting,
  Offline,
  NotConfigured,
}

enum class MessageSender {
  User,
  Support,
  System,
}

enum class MessageDeliveryStatus {
  Sending,
  Sent,
  Failed,
}

data class ChatMessage(
  val id: String,
  val sender: MessageSender,
  val text: String,
  val timestampLabel: String,
  val deliveryStatus: MessageDeliveryStatus,
  val attachmentName: String? = null,
)

data class ReceiptAttachment(
  val uriString: String,
  val displayName: String,
  val mimeType: String,
  val sizeBytes: Long,
)

sealed interface ReceiptUploadState {
  data object None : ReceiptUploadState
  data class Selected(val attachment: ReceiptAttachment) : ReceiptUploadState
  data class Uploading(val attachment: ReceiptAttachment) : ReceiptUploadState
  data class Sent(val attachment: ReceiptAttachment, val referenceId: String?) : ReceiptUploadState
  data class Error(val attachment: ReceiptAttachment, val message: String) : ReceiptUploadState
}

enum class NotificationPermissionStatus {
  Default,
  Granted,
  Denied,
  Unsupported,
}

enum class LegalDocumentType {
  Privacy,
  Terms,
  Cookies,
  ResponsibleGaming,
}

sealed interface NameValidationResult {
  data class Valid(val normalized: String) : NameValidationResult
  data class Invalid(val errorResKey: NameValidationError) : NameValidationResult
}

enum class NameValidationError {
  Empty,
  TooShort,
  TooLong,
  InvalidCharacters,
}

object NameValidator {
  private val allowedPattern = Regex("^[\\p{L}0-9 ._-]+$")

  fun validate(rawInput: String): NameValidationResult {
    val trimmed = rawInput.trim().replace(Regex("\\s+"), " ")
    if (trimmed.isEmpty()) return NameValidationResult.Invalid(NameValidationError.Empty)
    if (trimmed.length < 3) return NameValidationResult.Invalid(NameValidationError.TooShort)
    if (trimmed.length > 24) return NameValidationResult.Invalid(NameValidationError.TooLong)
    if (!allowedPattern.matches(trimmed)) {
      return NameValidationResult.Invalid(NameValidationError.InvalidCharacters)
    }
    return NameValidationResult.Valid(trimmed)
  }
}
