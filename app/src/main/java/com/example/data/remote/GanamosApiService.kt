package com.example.data.remote

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Query

interface GanamosApiService {

  @GET("api/health")
  suspend fun getHealth(): Response<HealthResponse>

  @POST("api/register-player")
  suspend fun registerPlayer(
    @Body request: RegisterPlayerRequest,
  ): Response<RegisterPlayerResponse>

  @GET("api/session")
  suspend fun getCurrentSession(
    @Query("clientId") clientId: String,
  ): Response<SessionStatusResponse>

  @GET("api/payment-instructions")
  suspend fun getPublicPaymentInstructions(): Response<PaymentInstructionsResponse>

  @GET("api/chat/history")
  suspend fun getChatHistory(
    @Query("clientId") clientId: String,
    @Query("playerId") playerId: String,
  ): Response<ChatHistoryResponse>

  @POST("api/chat/messages")
  suspend fun sendChatMessage(
    @Body request: SendChatRequest,
  ): Response<SendChatResponse>

  @Multipart
  @POST("api/chat/receipts")
  suspend fun uploadReceipt(
    @Part("clientId") clientId: RequestBody,
    @Part("playerId") playerId: RequestBody,
    @Part file: MultipartBody.Part,
  ): Response<ReceiptUploadResponse>
}
