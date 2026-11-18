import { useEffect, useRef, useState, type ReactNode } from 'react'

import { appConfig } from '../config/appConfig'
import { copyText } from '../lib/clipboard'
import { storage } from '../lib/storage'
import type {
  EphemeralCredentials,
  LegalDocumentType,
  PlayerAccount,
} from '../types'
import { EmblemBadge, GanamosBackground, PrimaryButton, SecondaryButton } from '../components/brand'
import {
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  ExternalIcon,
  KeyIcon,
  LogoutIcon,
  MinusIcon,
  PersonIcon,
  RefreshIcon,
  ShieldIcon,
  BellIcon,
  ChatIcon,
  DownloadIcon,
} from '../components/icons'
import { SupportChat } from '../components/SupportChat'

type IframeStatus = 'loading' | 'ready' | 'error'

export function PlatformScreen({
  account,
  credentials,
  online,
  backendReachable,
  backendChecking,
  canInstall,
  onRequestInstall,
  onOpenNotifications,
  onOpenLegal,
  onSignOut,
}: {
  account: PlayerAccount
  credentials: EphemeralCredentials | null
  online: boolean
  backendReachable: boolean
  backendChecking: boolean
  canInstall: boolean
  onRequestInstall: () => void
  onOpenNotifications: () => void
  onOpenLegal: (type: LegalDocumentType) => void
  onSignOut: () => void
}) {
  const [chatOpen, setChatOpen] = useState(() => !storage.getChatMinimized())
  const [pillMinimized, setPillMinimized] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copiedItem, setCopiedItem] = useState<'user' | 'pass' | null>(null)
  const [iframeStatus, setIframeStatus] = useState<IframeStatus>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  const menuRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<number | null>(null)

  const username = account.username || 'Cuenta'
  const temporaryPassword = credentials?.temporaryPassword ?? null
  const showFallback = !online || iframeStatus === 'error'

  useEffect(() => {
    setIframeStatus('loading')
    const timer = window.setTimeout(() => {
      setIframeStatus((current) => (current === 'loading' ? 'error' : current))
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [reloadKey])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const markCopied = (item: 'user' | 'pass') => {
    setCopiedItem(item)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopiedItem(null), 2000)
  }

  const closeChat = () => {
    setChatOpen(false)
    storage.setChatMinimized(true)
  }

  const openChat = () => {
    setChatOpen(true)
    storage.setChatMinimized(false)
  }

  const openExternal = () => {
    window.open(appConfig.platformUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <GanamosBackground>
      <div className="relative h-dvh w-screen overflow-hidden">
        {!showFallback && (
          <iframe
            key={reloadKey}
            src={appConfig.platformUrl}
            title={`Plataforma ${appConfig.brandName}`}
            onLoad={() => setIframeStatus('ready')}
            allow="clipboard-write; clipboard-read; fullscreen; autoplay"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-dvh w-screen max-w-full border-0 bg-white"
          />
        )}

        {iframeStatus === 'loading' && !showFallback && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-surface-strong">
            <div className="h-full w-1/3 animate-loading-slide bg-primary" />
          </div>
        )}

        {showFallback && (
          <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-5 py-6 pt-safe pb-safe">
            <div className="w-full max-w-[440px] rounded-[24px] border border-borderSubtle bg-bg-elevated/95 p-6 shadow-floating">
              <div className="flex flex-col items-center gap-3 text-center">
                <EmblemBadge size={64} />
                <h1 className="font-display text-xl font-bold text-ink-primary">
                  {!online ? 'Sin conexión a internet' : 'No pudimos cargar ganamos.net acá'}
                </h1>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {!online
                    ? `Verificá tu conexión para cargar ${appConfig.domain} dentro de Ganamos.`
                    : 'El sitio externo bloqueó la carga o no hay conexión disponible en este momento.'}
                </p>
                <div className="w-full space-y-2 pt-1">
                  <PrimaryButton
                    leadingIcon={<RefreshIcon width={20} height={20} />}
                    onClick={() => {
                      setIframeStatus('loading')
                      setReloadKey((value) => value + 1)
                    }}
                  >
                    Reintentar
                  </PrimaryButton>
                  <SecondaryButton
                    leadingIcon={<ExternalIcon width={18} height={18} />}
                    onClick={openExternal}
                  >
                    Abrir en navegador
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Píldora flotante de credenciales */}
        <div className="absolute left-3 top-0 z-40 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
          {pillMinimized ? (
            <button
              type="button"
              onClick={() => setPillMinimized(false)}
              aria-label="Opciones de credenciales"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-borderSubtle bg-bg-elevated/90 text-primary-soft shadow-floating backdrop-blur-md transition active:scale-95"
            >
              <PersonIcon width={20} height={20} />
            </button>
          ) : (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="Opciones de credenciales"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-borderSubtle bg-bg-elevated/90 px-3 py-2 text-ink-primary shadow-floating backdrop-blur-md transition hover:border-primary-soft/50 active:scale-[0.98]"
              >
                <PersonIcon width={16} height={16} className="shrink-0 text-primary-soft" />
                <span className="truncate text-xs font-semibold">{username}</span>
                {account.isDemo && (
                  <span className="shrink-0 text-[10px] text-warning">· Demo</span>
                )}
                <ChevronDownIcon
                  width={14}
                  height={14}
                  className={`shrink-0 text-ink-muted transition ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-borderSubtle bg-surface shadow-floating animate-slide-up"
                >
                  <MenuItem
                    icon={<CopyIcon width={18} height={18} />}
                    label={copiedItem === 'user' ? '¡Copiado! ✓' : 'Copiar usuario'}
                    highlight={copiedItem === 'user'}
                    onClick={() => {
                      if (!account.username) return
                      void copyText(account.username).then((ok) => ok && markCopied('user'))
                    }}
                  />

                  {temporaryPassword?.trim() && (
                    <MenuItem
                      icon={<KeyIcon width={18} height={18} />}
                      label={copiedItem === 'pass' ? '¡Copiado! ✓' : 'Copiar clave'}
                      highlight={copiedItem === 'pass'}
                      onClick={() => {
                        void copyText(temporaryPassword).then((ok) => ok && markCopied('pass'))
                      }}
                    />
                  )}

                  <div className="my-1 h-px bg-borderSubtle" />

                  <MenuItem
                    icon={<BellIcon width={18} height={18} />}
                    label="Notificaciones"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenNotifications()
                    }}
                  />
                  <MenuItem
                    icon={<ShieldIcon width={18} height={18} />}
                    label="Juego Responsable"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenLegal('responsible')
                    }}
                  />
                  <MenuItem
                    icon={<ExternalIcon width={18} height={18} />}
                    label="Abrir en navegador"
                    onClick={() => {
                      setMenuOpen(false)
                      openExternal()
                    }}
                  />
                  <MenuItem
                    icon={<MinusIcon width={18} height={18} />}
                    label="Minimizar píldora"
                    onClick={() => {
                      setMenuOpen(false)
                      setPillMinimized(true)
                    }}
                  />
                  <MenuItem
                    icon={<LogoutIcon width={18} height={18} />}
                    label="Cerrar sesión"
                    tone="warning"
                    onClick={() => {
                      setMenuOpen(false)
                      onSignOut()
                    }}
                  />
                  <MenuItem
                    icon={<CloseIcon width={18} height={18} />}
                    label="Cerrar menú"
                    tone="muted"
                    onClick={() => setMenuOpen(false)}
                  />
                </div>
              )}

              {copiedItem && (
                <span
                  role="status"
                  aria-live="polite"
                  className="absolute left-0 top-full mt-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success-bright"
                >
                  ¡Copiado! ✓
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chat abierto automáticamente */}
        {chatOpen ? (
          <SupportChat
            account={account}
            credentials={credentials}
            online={online}
            backendReachable={backendReachable}
            backendChecking={backendChecking}
            canInstall={canInstall}
            onMinimize={closeChat}
            onRequestInstall={onRequestInstall}
          />
        ) : (
          <div className="absolute bottom-0 right-0 z-40 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pr-4">
            <button
              type="button"
              onClick={openChat}
              aria-label="Abrir chat de soporte"
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-floating transition hover:brightness-110 active:scale-95"
            >
              <ChatIcon width={26} height={26} />
            </button>
          </div>
        )}

        {/* Instalar app (acceso discreto fuera del chat) */}
        {canInstall && !chatOpen && (
          <div className="absolute bottom-0 left-3 z-30 pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
            <button
              type="button"
              onClick={onRequestInstall}
              className="flex items-center gap-1.5 rounded-full border border-borderSubtle bg-bg-elevated/90 px-3 py-2 text-[11px] font-semibold text-ink-primary shadow-floating backdrop-blur-md"
            >
              <DownloadIcon width={15} height={15} className="text-primary-soft" />
              Instalar app
            </button>
          </div>
        )}

      </div>
    </GanamosBackground>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = 'default',
  highlight = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  tone?: 'default' | 'warning' | 'muted'
  highlight?: boolean
}) {
  const color =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'muted'
        ? 'text-ink-subtle'
        : highlight
          ? 'text-success-bright'
          : 'text-ink-primary'

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-white/5 ${color}`}
    >
      <span className={tone === 'default' ? 'text-ink-muted' : ''}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
