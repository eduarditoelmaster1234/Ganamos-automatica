package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class HealthResponse(
  val ok: Boolean = false,
  @param:Json(name = "chat_enabled") val chatEnabled: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class RegisterPlayerRequest(
  val clientId: String,
  val name: String,
  @param:Json(name = "utm_source") val utmSource: String? = null,
  @param:Json(name = "utm_campaign") val utmCampaign: String? = null,
  val fbclid: String? = null,
)

@JsonClass(generateAdapter = true)
data class RegisterUserDto(
  val id: String,
  val username: String,
  val temporaryPassword: String? = null,
  val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class RegisterPlayerResponse(
  val success: Boolean = false,
  val user: RegisterUserDto? = null,
  val message: String? = null,
)

@JsonClass(generateAdapter = true)
data class SessionStatusResponse(
  val authenticated: Boolean = false,
  val user: RegisterUserDto? = null,
)

@JsonClass(generateAdapter = true)
data class PaymentInstructionsResponse(
  val configured: Boolean = false,
  val cbu: String? = null,
  val alias: String? = null,
  val accountHolder: String? = null,
  val minimumDepositLabel: String? = null,
)

@JsonClass(generateAdapter = true)
data class ChatMessageDto(
  val id: String,
  val sender: String,
  val text: String,
  val timestamp: String? = null,
  val attachmentName: String? = null,
)

@JsonClass(generateAdapter = true)
data class ChatHistoryResponse(
  val messages: List<ChatMessageDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class SendChatRequest(
  val clientId: String,
  val playerId: String,
  val text: String,
  val topic: String? = null,
)

@JsonClass(generateAdapter = true)
data class SendChatResponse(
  val success: Boolean = false,
  val message: ChatMessageDto? = null,
)

@JsonClass(generateAdapter = true)
data class ReceiptUploadResponse(
  val success: Boolean = false,
  val receiptId: String? = null,
  val message: String? = null,
)
