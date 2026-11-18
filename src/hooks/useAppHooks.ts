import { useEffect, useState } from 'react'

import { checkBackendHealth } from '../lib/api'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown'

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios'
  // iPadOS 13+ se presenta como Mac con touch.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop'
  return 'unknown'
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return media || iosStandalone
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone())
  const platform = detectPlatform()

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setPromptEvent(null)
    }
    const media = window.matchMedia?.('(display-mode: standalone)')

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    media?.addEventListener?.('change', () => setIsInstalled(detectStandalone()))

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent) return 'unavailable'
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
      }
      setPromptEvent(null)
      return choice.outcome
    } catch {
      return 'unavailable'
    }
  }

  return {
    canPrompt: Boolean(promptEvent),
    isInstalled,
    platform,
    promptInstall,
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return online
}

export function useBackendHealth(): {
  reachable: boolean
  checking: boolean
  refresh: () => void
} {
  const [reachable, setReachable] = useState(false)
  const [checking, setChecking] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    void checkBackendHealth().then((ok) => {
      if (!cancelled) {
        setReachable(ok)
        setChecking(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [nonce])

  useEffect(() => {
    const onOnline = () => setNonce((value) => value + 1)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return {
    reachable,
    checking,
    refresh: () => setNonce((value) => value + 1),
  }
}

export function useNotificationPermission(): {
  status: 'default' | 'granted' | 'denied' | 'unsupported'
  request: () => Promise<void>
  refresh: () => void
} {
  const supported = typeof window !== 'undefined' && 'Notification' in window

  const [status, setStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!supported) return 'unsupported'
    return Notification.permission as 'default' | 'granted' | 'denied'
  })

  const refresh = () => {
    if (!supported) {
      setStatus('unsupported')
      return
    }
    setStatus(Notification.permission as 'default' | 'granted' | 'denied')
  }

  const request = async () => {
    if (!supported) {
      setStatus('unsupported')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setStatus(result as 'default' | 'granted' | 'denied')
    } catch {
      refresh()
    }
  }

  return { status, request, refresh }
}
