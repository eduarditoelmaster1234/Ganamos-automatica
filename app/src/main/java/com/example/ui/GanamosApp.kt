package com.example.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.ui.components.GanamosBackground
import com.example.ui.components.LegalDocumentSheet
import com.example.ui.components.NotificationsSheet
import com.example.ui.components.resolveNotificationPermissionStatus
import com.example.ui.screens.AccountCreatedScreen
import com.example.ui.screens.PlatformScreen
import com.example.ui.screens.RegistrationScreen
import com.example.ui.theme.PrimaryViolet

const val ROUTE_REGISTER = "register"
const val ROUTE_ACCOUNT_CREATED = "account_created"
const val ROUTE_PLATFORM = "platform"

@Composable
fun GanamosApp(
  viewModel: GanamosViewModel,
) {
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current
  val navController = rememberNavController()

  LaunchedEffect(Unit) {
    viewModel.updateNotificationStatus(resolveNotificationPermissionStatus(context))
  }

  LaunchedEffect(uiState.initialized, uiState.destination) {
    if (!uiState.initialized) return@LaunchedEffect
    val targetRoute = when (uiState.destination) {
      AppDestination.Register -> ROUTE_REGISTER
      AppDestination.AccountCreated -> ROUTE_ACCOUNT_CREATED
      AppDestination.Platform -> ROUTE_PLATFORM
    }
    val currentRoute = navController.currentBackStackEntry?.destination?.route
    if (currentRoute != targetRoute) {
      navController.navigate(targetRoute) {
        popUpTo(navController.graph.startDestinationId) {
          inclusive = true
        }
        launchSingleTop = true
      }
    }
  }

  if (!uiState.initialized) {
    GanamosBackground {
      Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
      ) {
        CircularProgressIndicator(color = PrimaryViolet)
      }
    }
    return
  }

  NavHost(
    navController = navController,
    startDestination = ROUTE_REGISTER,
  ) {
    composable(ROUTE_REGISTER) {
      RegistrationScreen(
        uiState = uiState,
        onNameChanged = viewModel::onNameChanged,
        onSubmit = viewModel::submitRegistration,
        onRetryHealth = viewModel::refreshBackendStatus,
        onEnterDemoPreview = viewModel::enterDemoPreview,
        onOpenLegal = viewModel::openLegalDocument,
      )
    }

    composable(ROUTE_ACCOUNT_CREATED) {
      BackHandler {
        viewModel.signOut()
      }
      val account = uiState.activeAccount
      if (account != null) {
        AccountCreatedScreen(
          account = account,
          credentials = uiState.ephemeralCredentials,
          onContinue = viewModel::continueToPlatform,
        )
      }
    }

    composable(ROUTE_PLATFORM) {
      PlatformScreen(
        uiState = uiState,
        onOpenChat = viewModel::openChat,
        onMinimizeChat = viewModel::minimizeChat,
        onQuickAction = viewModel::triggerQuickAction,
        onComposerChanged = viewModel::onChatComposerChanged,
        onSendMessage = { viewModel.sendChatText() },
        onReceiptSelected = viewModel::onReceiptSelected,
        onClearReceipt = viewModel::clearSelectedReceipt,
        onUploadReceipt = viewModel::uploadSelectedReceipt,
        onToggleCredentialPillMinimized = viewModel::setCredentialPillMinimized,
        onOpenNotifications = {
          viewModel.openNotificationsSheet(resolveNotificationPermissionStatus(context))
        },
        onOpenLegal = viewModel::openLegalDocument,
        onSignOut = viewModel::signOut,
      )
    }
  }

  val activeLegal = uiState.activeLegalDocument
  if (activeLegal != null) {
    LegalDocumentSheet(
      documentType = activeLegal,
      onDismiss = viewModel::closeLegalDocument,
    )
  }

  if (uiState.isNotificationsSheetOpen) {
    NotificationsSheet(
      status = uiState.notificationStatus,
      onStatusUpdated = viewModel::updateNotificationStatus,
      onDismissForNow = viewModel::dismissNotificationsPrompt,
      onClose = viewModel::closeNotificationsSheet,
    )
  }
}
