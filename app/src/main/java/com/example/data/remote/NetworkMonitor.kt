package com.example.data.remote

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

interface NetworkMonitor {
  val isOnlineFlow: Flow<Boolean>
  fun isCurrentlyOnline(): Boolean
}

class AndroidNetworkMonitor(context: Context) : NetworkMonitor {
  private val connectivityManager =
    context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

  override fun isCurrentlyOnline(): Boolean {
    val manager = connectivityManager ?: return false
    val network = manager.activeNetwork ?: return false
    val caps = manager.getNetworkCapabilities(network) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
      caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
  }

  override val isOnlineFlow: Flow<Boolean> = callbackFlow {
    val manager = connectivityManager
    if (manager == null) {
      trySend(false)
      close()
      return@callbackFlow
    }

    trySend(isCurrentlyOnline())

    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) {
        trySend(isCurrentlyOnline())
      }

      override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
        val online = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        trySend(online)
      }

      override fun onLost(network: Network) {
        trySend(isCurrentlyOnline())
      }
    }

    val request = NetworkRequest.Builder()
      .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .build()

    runCatching { manager.registerNetworkCallback(request, callback) }
    awaitClose { runCatching { manager.unregisterNetworkCallback(callback) } }
  }.distinctUntilChanged()
}
