package com.example

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.preferences.SessionPreferencesStore
import com.example.data.remote.AndroidNetworkMonitor
import com.example.data.repository.DefaultGanamosRepository
import com.example.domain.model.AttributionParams
import com.example.ui.GanamosApp
import com.example.ui.GanamosViewModel
import com.example.ui.theme.GanamosTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    val attribution = extractAttribution(intent)
    val preferencesStore = SessionPreferencesStore(applicationContext)
    val networkMonitor = AndroidNetworkMonitor(applicationContext)
    val repository = DefaultGanamosRepository(
      networkMonitor = networkMonitor,
      contentResolver = applicationContext.contentResolver,
    )

    setContent {
      GanamosTheme {
        val ganamosViewModel: GanamosViewModel = viewModel(
          factory = GanamosViewModel.Factory(
            repository = repository,
            preferencesStore = preferencesStore,
            networkMonitor = networkMonitor,
            attribution = attribution,
          )
        )
        GanamosApp(viewModel = ganamosViewModel)
      }
    }
  }

  private fun extractAttribution(intent: Intent?): AttributionParams {
    val data = intent?.data ?: return AttributionParams()
    return AttributionParams(
      utmSource = data.getQueryParameter("utm_source")?.takeIf { it.isNotBlank() },
      utmCampaign = data.getQueryParameter("utm_campaign")?.takeIf { it.isNotBlank() },
      fbclid = data.getQueryParameter("fbclid")?.takeIf { it.isNotBlank() },
    )
  }
}
