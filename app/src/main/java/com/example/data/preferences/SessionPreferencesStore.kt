package com.example.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.domain.model.PlayerAccount
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.ganamosDataStore: DataStore<Preferences> by preferencesDataStore(
  name = "ganamos_preferences"
)

data class StoredPreferencesSnapshot(
  val clientId: String,
  val account: PlayerAccount?,
  val onboardingCompleted: Boolean,
  val chatMinimized: Boolean,
  val legalNoticeVersion: Int,
  val notificationsDismissed: Boolean,
)

interface SessionPreferences {
  val preferencesFlow: Flow<StoredPreferencesSnapshot>
  suspend fun getOrCreateClientId(): String
  suspend fun saveAccountSession(account: PlayerAccount, onboardingCompleted: Boolean = true)
  suspend fun setOnboardingCompleted(completed: Boolean)
  suspend fun setChatMinimized(minimized: Boolean)
  suspend fun setNotificationsDismissed(dismissed: Boolean)
  suspend fun markLegalNoticeAccepted(version: Int)
  suspend fun clearSession()
}

/**
 * Persists strictly non-sensitive preferences and session metadata.
 * Passwords, bearer tokens, full bank details, and receipt files are NEVER stored here.
 */
class SessionPreferencesStore(private val context: Context) : SessionPreferences {

  private object Keys {
    val CLIENT_ID = stringPreferencesKey("client_id")
    val PLAYER_ID = stringPreferencesKey("player_id")
    val PLAYER_USERNAME = stringPreferencesKey("player_username")
    val IS_DEMO = booleanPreferencesKey("is_demo_session")
    val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
    val CHAT_MINIMIZED = booleanPreferencesKey("chat_minimized")
    val LEGAL_NOTICE_VERSION = intPreferencesKey("legal_notice_version")
    val NOTIFICATIONS_DISMISSED = booleanPreferencesKey("notifications_dismissed")
  }

  override val preferencesFlow: Flow<StoredPreferencesSnapshot> = context.ganamosDataStore.data.map { prefs ->
    val clientId = prefs[Keys.CLIENT_ID].orEmpty()
    val playerId = prefs[Keys.PLAYER_ID]
    val username = prefs[Keys.PLAYER_USERNAME]
    val isDemo = prefs[Keys.IS_DEMO] ?: false
    val account = if (!playerId.isNullOrBlank() && !username.isNullOrBlank()) {
      PlayerAccount(id = playerId, username = username, isDemo = isDemo)
    } else {
      null
    }
    StoredPreferencesSnapshot(
      clientId = clientId,
      account = account,
      onboardingCompleted = prefs[Keys.ONBOARDING_COMPLETED] ?: false,
      chatMinimized = prefs[Keys.CHAT_MINIMIZED] ?: false,
      legalNoticeVersion = prefs[Keys.LEGAL_NOTICE_VERSION] ?: 0,
      notificationsDismissed = prefs[Keys.NOTIFICATIONS_DISMISSED] ?: false,
    )
  }

  override suspend fun getOrCreateClientId(): String {
    val current = context.ganamosDataStore.data.first()[Keys.CLIENT_ID]
    if (!current.isNullOrBlank()) return current
    val generated = UUID.randomUUID().toString()
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.CLIENT_ID] = generated
    }
    return generated
  }

  override suspend fun saveAccountSession(account: PlayerAccount, onboardingCompleted: Boolean) {
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.PLAYER_ID] = account.id
      prefs[Keys.PLAYER_USERNAME] = account.username
      prefs[Keys.IS_DEMO] = account.isDemo
      prefs[Keys.ONBOARDING_COMPLETED] = onboardingCompleted
    }
  }

  override suspend fun setOnboardingCompleted(completed: Boolean) {
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.ONBOARDING_COMPLETED] = completed
    }
  }

  override suspend fun setChatMinimized(minimized: Boolean) {
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.CHAT_MINIMIZED] = minimized
    }
  }

  override suspend fun setNotificationsDismissed(dismissed: Boolean) {
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.NOTIFICATIONS_DISMISSED] = dismissed
    }
  }

  override suspend fun markLegalNoticeAccepted(version: Int) {
    context.ganamosDataStore.edit { prefs ->
      prefs[Keys.LEGAL_NOTICE_VERSION] = version
    }
  }

  override suspend fun clearSession() {
    context.ganamosDataStore.edit { prefs ->
      prefs.remove(Keys.PLAYER_ID)
      prefs.remove(Keys.PLAYER_USERNAME)
      prefs.remove(Keys.IS_DEMO)
      prefs.remove(Keys.ONBOARDING_COMPLETED)
    }
  }
}
