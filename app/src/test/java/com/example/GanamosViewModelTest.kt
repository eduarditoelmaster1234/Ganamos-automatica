package com.example

import com.example.data.preferences.SessionPreferences
import com.example.data.preferences.StoredPreferencesSnapshot
import com.example.data.remote.NetworkMonitor
import com.example.data.repository.BackendHealthSnapshot
import com.example.data.repository.GanamosRepository
import com.example.domain.model.AsyncState
import com.example.domain.model.AttributionParams
import com.example.domain.model.BankTransferDetails
import com.example.domain.model.ChatConnectionStatus
import com.example.domain.model.ChatMessage
import com.example.domain.model.EphemeralCredentials
import com.example.domain.model.MessageDeliveryStatus
import com.example.domain.model.MessageSender
import com.example.domain.model.PlayerAccount
import com.example.domain.model.ReceiptAttachment
import com.example.domain.model.ReceiptUploadState
import com.example.domain.model.RegistrationOutcome
import com.example.ui.AppDestination
import com.example.ui.GanamosViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GanamosViewModelTest {

  private val testDispatcher = StandardTestDispatcher()

  @Before
  fun setUp() {
    Dispatchers.setMain(testDispatcher)
  }

  @After
  fun tearDown() {
    Dispatchers.resetMain()
  }

  @Test
  fun `unconfigured backend enters pending state and never fakes registration`() = runTest {
    val store = FakeSessionPreferences()
    val repo = FakeGanamosRepository(configured = false)
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    viewModel.onNameChanged("Valentina")
    viewModel.submitRegistration()
    advanceUntilIdle()

    val state = viewModel.uiState.value
    assertEquals(AppDestination.Register, state.destination)
    assertTrue(state.registrationPendingBackend)
    assertNull(state.activeAccount)
  }

  @Test
  fun `confirmed registration auto-opens chat on continue and keeps ephemeral creds until sign out`() = runTest {
    val store = FakeSessionPreferences()
    val repo = FakeGanamosRepository(configured = true)
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    viewModel.onNameChanged("Mateo")
    viewModel.submitRegistration()
    advanceUntilIdle()

    val createdState = viewModel.uiState.value
    assertEquals(AppDestination.AccountCreated, createdState.destination)
    assertEquals("mateo_ok", createdState.activeAccount?.username)
    assertEquals("temp-9911", createdState.ephemeralCredentials?.temporaryPassword)
    assertFalse(createdState.activeAccount?.isDemo ?: true)

    viewModel.continueToPlatform()
    advanceUntilIdle()

    val platformState = viewModel.uiState.value
    assertEquals(AppDestination.Platform, platformState.destination)
    assertTrue(platformState.isChatOpen)
    assertFalse(platformState.isChatMinimized)
    assertEquals("temp-9911", platformState.ephemeralCredentials?.temporaryPassword)

    viewModel.minimizeChat()
    advanceUntilIdle()
    assertFalse(viewModel.uiState.value.isChatOpen)
    assertTrue(viewModel.uiState.value.isChatMinimized)

    viewModel.signOut()
    advanceUntilIdle()
    assertEquals(AppDestination.Register, viewModel.uiState.value.destination)
    assertNull(viewModel.uiState.value.ephemeralCredentials)
    assertNull(viewModel.uiState.value.activeAccount)
  }

  @Test
  fun `session restore respects persisted minimized chat state`() = runTest {
    val store = FakeSessionPreferences(
      initialSnapshot = StoredPreferencesSnapshot(
        clientId = "client-1",
        account = PlayerAccount(id = "usr-1", username = "mateo_ok", isDemo = false),
        onboardingCompleted = true,
        chatMinimized = true,
        legalNoticeVersion = 1,
        notificationsDismissed = false,
      )
    )
    val repo = FakeGanamosRepository(configured = true)
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    assertEquals(AppDestination.Platform, viewModel.uiState.value.destination)
    assertFalse(viewModel.uiState.value.isChatOpen)
    assertTrue(viewModel.uiState.value.isChatMinimized)
  }

  @Test
  fun `backend network failure shows error and stays on registration`() = runTest {
    val store = FakeSessionPreferences()
    val repo = FakeGanamosRepository(
      configured = true,
      registrationOutcome = RegistrationOutcome.Offline("No pudimos crear tu cuenta."),
    )
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    viewModel.onNameChanged("Lucia")
    viewModel.submitRegistration()
    advanceUntilIdle()

    val state = viewModel.uiState.value
    assertEquals(AppDestination.Register, state.destination)
    assertNotNull(state.registrationErrorMessage)
    assertNull(state.activeAccount)
  }

  @Test
  fun `demo preview flags session as demo and auto-opens chat on continue`() = runTest {
    val store = FakeSessionPreferences()
    val repo = FakeGanamosRepository(configured = false)
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    viewModel.onNameChanged("Camila")
    viewModel.enterDemoPreview()
    advanceUntilIdle()

    val state = viewModel.uiState.value
    assertEquals(AppDestination.AccountCreated, state.destination)
    assertTrue(state.activeAccount?.isDemo == true)
    assertEquals(ChatConnectionStatus.NotConfigured, state.chatConnectionStatus)

    viewModel.continueToPlatform()
    advanceUntilIdle()
    assertTrue(viewModel.uiState.value.isChatOpen)
  }

  @Test
  fun `receipt validation rejects unsupported mime type and oversized file`() = runTest {
    val store = FakeSessionPreferences()
    val repo = FakeGanamosRepository(configured = true)
    val network = FakeNetworkMonitor(online = true)

    val viewModel = GanamosViewModel(repo, store, network)
    advanceUntilIdle()

    viewModel.onReceiptSelected(
      ReceiptAttachment(
        uriString = "content://test/script.sh",
        displayName = "script.sh",
        mimeType = "application/x-sh",
        sizeBytes = 1024L,
      )
    )
    assertTrue(viewModel.uiState.value.receiptUploadState is ReceiptUploadState.Error)

    viewModel.onReceiptSelected(
      ReceiptAttachment(
        uriString = "content://test/large.jpg",
        displayName = "large.jpg",
        mimeType = "image/jpeg",
        sizeBytes = 12L * 1024L * 1024L,
      )
    )
    assertTrue(viewModel.uiState.value.receiptUploadState is ReceiptUploadState.Error)

    viewModel.onReceiptSelected(
      ReceiptAttachment(
        uriString = "content://test/comprobante.png",
        displayName = "comprobante.png",
        mimeType = "image/png",
        sizeBytes = 250_000L,
      )
    )
    assertTrue(viewModel.uiState.value.receiptUploadState is ReceiptUploadState.Selected)
  }

  private class FakeSessionPreferences(
    initialSnapshot: StoredPreferencesSnapshot = StoredPreferencesSnapshot(
      clientId = "test-client-uuid",
      account = null,
      onboardingCompleted = false,
      chatMinimized = false,
      legalNoticeVersion = 0,
      notificationsDismissed = false,
    ),
  ) : SessionPreferences {
    private val snapshot = MutableStateFlow(initialSnapshot)
    override val preferencesFlow: Flow<StoredPreferencesSnapshot> = snapshot

    override suspend fun getOrCreateClientId(): String = snapshot.value.clientId

    override suspend fun saveAccountSession(account: PlayerAccount, onboardingCompleted: Boolean) {
      snapshot.value = snapshot.value.copy(
        account = account,
        onboardingCompleted = onboardingCompleted,
      )
    }

    override suspend fun setOnboardingCompleted(completed: Boolean) {
      snapshot.value = snapshot.value.copy(onboardingCompleted = completed)
    }

    override suspend fun setChatMinimized(minimized: Boolean) {
      snapshot.value = snapshot.value.copy(chatMinimized = minimized)
    }

    override suspend fun setNotificationsDismissed(dismissed: Boolean) {
      snapshot.value = snapshot.value.copy(notificationsDismissed = dismissed)
    }

    override suspend fun markLegalNoticeAccepted(version: Int) {
      snapshot.value = snapshot.value.copy(legalNoticeVersion = version)
    }

    override suspend fun clearSession() {
      snapshot.value = snapshot.value.copy(
        account = null,
        onboardingCompleted = false,
        chatMinimized = false,
      )
    }
  }

  private class FakeNetworkMonitor(online: Boolean) : NetworkMonitor {
    private val flow = MutableStateFlow(online)
    override val isOnlineFlow: Flow<Boolean> = flow
    override fun isCurrentlyOnline(): Boolean = flow.value
  }

  private class FakeGanamosRepository(
    private val configured: Boolean,
    private val registrationOutcome: RegistrationOutcome? = null,
  ) : GanamosRepository {
    override val isBackendConfigured: Boolean get() = configured

    override suspend fun checkBackendHealth(): AsyncState<BackendHealthSnapshot> =
      if (configured) {
        AsyncState.Success(BackendHealthSnapshot(reachable = true, chatEnabled = true))
      } else {
        AsyncState.NotConfigured("No configurado")
      }

    override suspend fun registerPlayer(
      clientId: String,
      normalizedName: String,
      attribution: AttributionParams,
    ): RegistrationOutcome {
      if (registrationOutcome != null) return registrationOutcome
      if (!configured) return RegistrationOutcome.NotConfigured("No configurado")
      val account = PlayerAccount(id = "usr-1", username = "mateo_ok", isDemo = false)
      return RegistrationOutcome.Confirmed(
        account = account,
        credentials = EphemeralCredentials(username = "mateo_ok", temporaryPassword = "temp-9911"),
      )
    }

    override suspend fun getPublicPaymentInstructions(): AsyncState<BankTransferDetails> =
      AsyncState.NotConfigured("Pendiente")

    override suspend fun getChatHistory(clientId: String, playerId: String): AsyncState<List<ChatMessage>> =
      AsyncState.Success(emptyList())

    override suspend fun sendChatMessage(
      clientId: String,
      playerId: String,
      text: String,
      topic: String?,
    ): AsyncState<ChatMessage> = AsyncState.Success(
      ChatMessage(
        id = "m-1",
        sender = MessageSender.User,
        text = text,
        timestampLabel = "12:00",
        deliveryStatus = MessageDeliveryStatus.Sent,
      )
    )

    override suspend fun uploadReceipt(
      clientId: String,
      playerId: String,
      attachment: ReceiptAttachment,
    ): AsyncState<String?> = AsyncState.Success("rec-1")
  }
}
