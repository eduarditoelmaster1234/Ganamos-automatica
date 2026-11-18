package com.example.config

import com.example.BuildConfig

data class PublicBankDetails(
  val cbu: String,
  val alias: String,
  val accountHolder: String,
  val minimumDepositLabel: String,
) {
  val isConfigured: Boolean
    get() = cbu.isNotBlank() && alias.isNotBlank() && accountHolder.isNotBlank()
}

data class SupportConfig(
  val chatEnabled: Boolean,
)

object AppConfig {
  const val brandName: String = "Ganamos"
  const val domain: String = "ganamos.net"
  const val legalNoticeVersion: Int = 1

  val platformUrl: String = BuildConfig.GANAMOS_PLATFORM_URL.trim().ifBlank { "https://ganamos.net" }
  val apiUrl: String = BuildConfig.GANAMOS_API_URL.trim().trimEnd('/')
  val embedAllowed: Boolean = BuildConfig.GANAMOS_EMBED_ALLOWED

  val support: SupportConfig = SupportConfig(
    chatEnabled = BuildConfig.GANAMOS_CHAT_ENABLED,
  )

  val bankDetails: PublicBankDetails = PublicBankDetails(
    cbu = BuildConfig.GANAMOS_PUBLIC_BANK_CBU.trim(),
    alias = BuildConfig.GANAMOS_PUBLIC_BANK_ALIAS.trim(),
    accountHolder = BuildConfig.GANAMOS_PUBLIC_BANK_HOLDER.trim(),
    minimumDepositLabel = BuildConfig.GANAMOS_MIN_DEPOSIT_LABEL.trim(),
  )

  val jurisdictionNotice: String = BuildConfig.GANAMOS_JURISDICTION_NOTICE.trim()

  val isBackendConfigured: Boolean
    get() = apiUrl.startsWith("https://", ignoreCase = true)
}
