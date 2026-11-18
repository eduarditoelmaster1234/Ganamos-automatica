package com.example.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.example.config.AppConfig
import com.example.data.remote.GanamosApiService
import com.example.data.remote.NetworkMonitor
import com.example.data.remote.RegisterPlayerRequest
import com.example.data.remote.SendChatRequest
import com.example.domain.model.AsyncState
import com.example.domain.model.AttributionParams
import com.example.domain.model.BankTransferDetails
import com.example.domain.model.ChatMessage
import com.example.domain.model.EphemeralCredentials
import com.example.domain.model.MessageDeliveryStatus
import com.example.domain.model.MessageSender
import com.example.domain.model.PlayerAccount
import com.example.domain.model.ReceiptAttachment
import com.example.domain.model.RegistrationOutcome
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

data class BackendHealthSnapshot(
  val reachable: Boolean,
  val chatEnabled: Boolean,
)

interface GanamosRepository {
  val isBackendConfigured: Boolean
  suspend fun checkBackendHealth(): AsyncState<BackendHealthSnapshot>
  suspend fun registerPlayer(
    clientId: String,
    normalizedName: String,
    attribution: AttributionParams,
  ): RegistrationOutcome

  suspend fun getPublicPaymentInstructions(): AsyncState<BankTransferDetails>
  suspend fun getChatHistory(clientId: String, playerId: String): AsyncState<List<ChatMessage>>
  suspend fun sendChatMessage(
    clientId: String,
    playerId: String,
    text: String,
    topic: String? = null,
  ): AsyncState<ChatMessage>

  suspend fun uploadReceipt(
    clientId: String,
    playerId: String,
    attachment: ReceiptAttachment,
  ): AsyncState<String?>
}

class DefaultGanamosRepository(
  private val networkMonitor: NetworkMonitor,
  private val contentResolver: ContentResolver,
  private val apiUrlOverride: String = AppConfig.apiUrl,
  apiServiceOverride: GanamosApiService? = null,
) : GanamosRepository {

  override val isBackendConfigured: Boolean
    get() = apiUrlOverride.startsWith("https://", ignoreCase = true)

  private val apiService: GanamosApiService? by lazy {
    if (apiServiceOverride != null) return@lazy apiServiceOverride
    if (!isBackendConfigured) return@lazy null
    val normalizedBaseUrl = if (apiUrlOverride.endsWith("/")) apiUrlOverride else "$apiUrlOverride/"
    val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    val client = OkHttpClient.Builder()
      .connectTimeout(15, TimeUnit.SECONDS)
      .readTimeout(20, TimeUnit.SECONDS)
      .writeTimeout(25, TimeUnit.SECONDS)
      .build()

    Retrofit.Builder()
      .baseUrl(normalizedBaseUrl)
      .client(client)
      .addConverterFactory(MoshiConverterFactory.create(moshi))
      .build()
      .create(GanamosApiService::class.java)
  }

  override suspend fun checkBackendHealth(): AsyncState<BackendHealthSnapshot> =
    withContext(Dispatchers.IO) {
      val service = apiService ?: return@withContext AsyncState.NotConfigured(
        "El servidor de Ganamos todavía no está configurado en este entorno."
      )
      if (!networkMonitor.isCurrentlyOnline()) {
        return@withContext AsyncState.Offline("Sin conexión a internet.")
      }
      try {
        val response = service.getHealth()
        val body = response.body()
        if (response.isSuccessful && body != null && body.ok) {
          AsyncState.Success(
            BackendHealthSnapshot(
              reachable = true,
              chatEnabled = body.chatEnabled || AppConfig.support.chatEnabled,
            )
          )
        } else {
          AsyncState.Error("No se pudo verificar el estado del servidor.")
        }
      } catch (_: IOException) {
        AsyncState.Offline("No pudimos comunicarnos con el servidor.")
      } catch (_: Exception) {
        AsyncState.Error("Error inesperado al verificar el servidor.")
      }
    }

  override suspend fun registerPlayer(
    clientId: String,
    normalizedName: String,
    attribution: AttributionParams,
  ): RegistrationOutcome = withContext(Dispatchers.IO) {
    val service = apiService ?: return@withContext RegistrationOutcome.NotConfigured(
      "El endpoint de registro no está configurado."
    )
    if (!networkMonitor.isCurrentlyOnline()) {
      return@withContext RegistrationOutcome.Offline(
        "No pudimos crear tu cuenta. Revisá tu conexión e intentá nuevamente."
      )
    }

    try {
      val response = service.registerPlayer(
        RegisterPlayerRequest(
          clientId = clientId,
          name = normalizedName,
          utmSource = attribution.utmSource,
          utmCampaign = attribution.utmCampaign,
          fbclid = attribution.fbclid,
        )
      )
      val body = response.body()
      if (response.isSuccessful && body?.success == true && body.user != null) {
        val account = PlayerAccount(
          id = body.user.id,
          username = body.user.username,
          isDemo = false,
          createdAtIso = body.user.createdAt,
        )
        val credentials = EphemeralCredentials(
          username = body.user.username,
          temporaryPassword = body.user.temporaryPassword,
        )
        RegistrationOutcome.Confirmed(account = account, credentials = credentials)
      } else {
        RegistrationOutcome.Failed(
          body?.message?.takeIf { it.isNotBlank() }
            ?: "El servidor no pudo confirmar el registro. Intentá nuevamente."
        )
      }
    } catch (_: IOException) {
      RegistrationOutcome.Offline(
        "No pudimos crear tu cuenta. Revisá tu conexión e intentá nuevamente."
      )
    } catch (_: Exception) {
      RegistrationOutcome.Failed("Ocurrió un problema al registrar tu cuenta. Intentá de nuevo.")
    }
  }

  override suspend fun getPublicPaymentInstructions(): AsyncState<BankTransferDetails> =
    withContext(Dispatchers.IO) {
      val localConfig = AppConfig.bankDetails
      val service = apiService
      if (service == null) {
        return@withContext if (localConfig.isConfigured) {
          AsyncState.Success(
            BankTransferDetails(
              cbu = localConfig.cbu,
              alias = localConfig.alias,
              accountHolder = localConfig.accountHolder,
              minimumDepositLabel = localConfig.minimumDepositLabel,
            )
          )
        } else {
          AsyncState.NotConfigured("Datos de transferencia pendientes de configuración.")
        }
      }

      if (!networkMonitor.isCurrentlyOnline()) {
        return@withContext AsyncState.Offline("Sin conexión para consultar datos vigentes.")
      }

      try {
        val response = service.getPublicPaymentInstructions()
        val body = response.body()
        if (response.isSuccessful && body != null && body.configured) {
          val details = BankTransferDetails(
            cbu = body.cbu.orEmpty().trim(),
            alias = body.alias.orEmpty().trim(),
            accountHolder = body.accountHolder.orEmpty().trim(),
            minimumDepositLabel = body.minimumDepositLabel.orEmpty().trim(),
          )
          if (details.isConfigured) {
            AsyncState.Success(details)
          } else {
            AsyncState.NotConfigured("Los datos bancarios no están completos.")
          }
        } else if (localConfig.isConfigured) {
          AsyncState.Success(
            BankTransferDetails(
              cbu = localConfig.cbu,
              alias = localConfig.alias,
              accountHolder = localConfig.accountHolder,
              minimumDepositLabel = localConfig.minimumDepositLabel,
            )
          )
        } else {
          AsyncState.NotConfigured("Datos de transferencia pendientes de configuración.")
        }
      } catch (_: IOException) {
        AsyncState.Offline("No pudimos actualizar las instrucciones de pago.")
      } catch (_: Exception) {
        AsyncState.Error("No pudimos obtener las instrucciones de pago.")
      }
    }

  override suspend fun getChatHistory(
    clientId: String,
    playerId: String,
  ): AsyncState<List<ChatMessage>> = withContext(Dispatchers.IO) {
    val service = apiService ?: return@withContext AsyncState.NotConfigured(
      "El chat de soporte no está configurado en este entorno."
    )
    if (!networkMonitor.isCurrentlyOnline()) {
      return@withContext AsyncState.Offline("El chat no está disponible sin conexión.")
    }
    try {
      val response = service.getChatHistory(clientId = clientId, playerId = playerId)
      if (response.code() == 401) {
        return@withContext AsyncState.Unauthorized("Tu sesión venció. Volvé a iniciar acceso.")
      }
      val body = response.body()
      if (response.isSuccessful && body != null) {
        val mapped = body.messages.map { dto ->
          ChatMessage(
            id = dto.id,
            sender = when (dto.sender.lowercase()) {
              "user" -> MessageSender.User
              "system" -> MessageSender.System
              else -> MessageSender.Support
            },
            text = dto.text,
            timestampLabel = dto.timestamp.orEmpty(),
            deliveryStatus = MessageDeliveryStatus.Sent,
            attachmentName = dto.attachmentName,
          )
        }
        AsyncState.Success(mapped)
      } else {
        AsyncState.Error("El chat no está disponible en este momento.")
      }
    } catch (_: IOException) {
      AsyncState.Offline("El chat no está disponible en este momento.")
    } catch (_: Exception) {
      AsyncState.Error("No pudimos cargar el historial del chat.")
    }
  }

  override suspend fun sendChatMessage(
    clientId: String,
    playerId: String,
    text: String,
    topic: String?,
  ): AsyncState<ChatMessage> = withContext(Dispatchers.IO) {
    val service = apiService ?: return@withContext AsyncState.NotConfigured(
      "El chat de soporte requiere configuración del servidor."
    )
    if (!networkMonitor.isCurrentlyOnline()) {
      return@withContext AsyncState.Offline("Sin conexión para enviar el mensaje.")
    }
    try {
      val response = service.sendChatMessage(
        SendChatRequest(
          clientId = clientId,
          playerId = playerId,
          text = text,
          topic = topic,
        )
      )
      if (response.code() == 401) {
        return@withContext AsyncState.Unauthorized("Tu sesión venció. Volvé a ingresar.")
      }
      val body = response.body()
      if (response.isSuccessful && body?.success == true && body.message != null) {
        val dto = body.message
        AsyncState.Success(
          ChatMessage(
            id = dto.id,
            sender = MessageSender.User,
            text = dto.text,
            timestampLabel = dto.timestamp.orEmpty(),
            deliveryStatus = MessageDeliveryStatus.Sent,
            attachmentName = dto.attachmentName,
          )
        )
      } else {
        AsyncState.Error("No pudimos enviar el mensaje. Intentá nuevamente.")
      }
    } catch (_: IOException) {
      AsyncState.Offline("No pudimos enviar el mensaje por falta de conexión.")
    } catch (_: Exception) {
      AsyncState.Error("Error al enviar el mensaje.")
    }
  }

  override suspend fun uploadReceipt(
    clientId: String,
    playerId: String,
    attachment: ReceiptAttachment,
  ): AsyncState<String?> = withContext(Dispatchers.IO) {
    val service = apiService ?: return@withContext AsyncState.NotConfigured(
      "La recepción de comprobantes requiere configurar el servidor."
    )
    if (!networkMonitor.isCurrentlyOnline()) {
      return@withContext AsyncState.Offline("Sin conexión para enviar el comprobante.")
    }

    val uri = runCatching { Uri.parse(attachment.uriString) }.getOrNull()
      ?: return@withContext AsyncState.Error("El archivo seleccionado no es válido.")

    val bytes = try {
      contentResolver.openInputStream(uri)?.use { it.readBytes() }
    } catch (_: Exception) {
      null
    } ?: return@withContext AsyncState.Error("No pudimos leer el archivo seleccionado.")

    if (bytes.size > 10 * 1024 * 1024) {
      return@withContext AsyncState.Error("El comprobante supera el límite de 10 MB.")
    }

    try {
      val textPlain = "text/plain".toMediaTypeOrNull()
      val mediaType = attachment.mimeType.toMediaTypeOrNull()
      val requestFile = bytes.toRequestBody(mediaType)
      val part = MultipartBody.Part.createFormData("file", attachment.displayName, requestFile)

      val response = service.uploadReceipt(
        clientId = clientId.toRequestBody(textPlain),
        playerId = playerId.toRequestBody(textPlain),
        file = part,
      )
      if (response.code() == 401) {
        return@withContext AsyncState.Unauthorized("Tu sesión venció. Volvé a iniciar acceso.")
      }
      val body = response.body()
      if (response.isSuccessful && body?.success == true) {
        AsyncState.Success(body.receiptId)
      } else {
        AsyncState.Error(
          body?.message?.takeIf { it.isNotBlank() }
            ?: "No se pudo enviar el archivo. Podés intentarlo nuevamente."
        )
      }
    } catch (_: IOException) {
      AsyncState.Offline("No se pudo enviar el archivo. Revisá tu conexión e intentá nuevamente.")
    } catch (_: Exception) {
      AsyncState.Error("No se pudo enviar el archivo. Podés intentarlo nuevamente.")
    }
  }
}
