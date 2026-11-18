import { useEffect, useState } from 'react'

import { AccountCreatedScreen } from './screens/AccountCreatedScreen'
import { PlatformScreen } from './screens/PlatformScreen'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { InstallSheet } from './components/InstallSheet'
import { LegalSheet } from './components/LegalSheet'
import { NotificationsSheet } from './components/NotificationsSheet'
import {
  useBackendHealth,
  useNotificationPermission,
  useOnlineStatus,
  usePwaInstall,
} from './hooks/useAppHooks'
import { captureAttribution, storage } from './lib/storage'
import type {
  Destination,
  EphemeralCredentials,
  LegalDocumentType,
  PlayerAccount,
  RegistrationResult,
} from './types'

function resolveInitialDestination(): Destination {
  const account = storage.getAccount()
  if (!account) return 'register'
  return storage.getOnboardingCompleted() ? 'platform' : 'account-created'
}

export default function App() {
  const [account, setAccount] = useState<PlayerAccount | null>(() => storage.getAccount())
  // La clave temporal no se persiste: solo vive en memoria.
  const [credentials, setCredentials] = useState<EphemeralCredentials | null>(null)
  const [destination, setDestination] = useState<Destination>(resolveInitialDestination)
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)

  const online = useOnlineStatus()
  const backend = useBackendHealth()
  const notifications = useNotificationPermission()
  const pwaInstall = usePwaInstall()

  useEffect(() => {
    captureAttribution()
  }, [])

  const handleRegistered = (result: RegistrationResult) => {
    storage.saveAccount(result.account)
    storage.savePlayerToken(result.token)
    storage.setOnboardingCompleted(false)
    storage.setChatMinimized(false)
    setAccount(result.account)
    setCredentials(result.credentials)
    setDestination('account-created')
  }

  const handleContinue = () => {
    if (!account) return
    storage.setOnboardingCompleted(true)
    storage.setChatMinimized(false)
    setDestination('platform')
  }

  const handleSignOut = () => {
    storage.clearSession()
    setAccount(null)
    setCredentials(null)
    setDestination('register')
    setNotificationsOpen(false)
    setInstallOpen(false)
  }

  const openNotifications = () => {
    notifications.refresh()
    setNotificationsOpen(true)
  }

  /**
   * En Android/Chrome el prompt nativo debe ejecutarse en el mismo gesto
   * del usuario. Si el navegador no lo ofrece, se abre la guía manual
   * (iOS/Safari o navegadores sin soporte).
   */
  const handleInstallClick = () => {
    if (pwaInstall.canPrompt) {
      void pwaInstall.promptInstall()
      return
    }
    setInstallOpen(true)
  }

  return (
    <>
      {(!account || destination === 'register') && (
        <RegistrationScreen
          online={online}
          onRegistered={handleRegistered}
          onOpenLegal={setLegalDocument}
        />
      )}

      {account && destination === 'account-created' && (
        <AccountCreatedScreen
          account={account}
          credentials={credentials}
          onContinue={handleContinue}
        />
      )}

      {account && destination === 'platform' && (
        <PlatformScreen
          account={account}
          credentials={credentials}
          online={online}
          backendReachable={backend.reachable}
          backendChecking={backend.checking}
          canInstall={!pwaInstall.isInstalled}
          onInstallClick={handleInstallClick}
          onOpenNotifications={openNotifications}
          onOpenLegal={setLegalDocument}
          onSignOut={handleSignOut}
        />
      )}

      <LegalSheet documentType={legalDocument} onClose={() => setLegalDocument(null)} />

      <NotificationsSheet
        open={notificationsOpen}
        status={notifications.status}
        onRequest={() => void notifications.request()}
        onDismissForNow={() => {
          storage.setNotificationsDismissed(true)
          setNotificationsOpen(false)
        }}
        onClose={() => setNotificationsOpen(false)}
      />

      <InstallSheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        platform={pwaInstall.platform}
        canPrompt={pwaInstall.canPrompt}
        isInstalled={pwaInstall.isInstalled}
        onInstall={pwaInstall.promptInstall}
      />
    </>
  )
}
