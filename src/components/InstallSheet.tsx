import { useState, type ReactNode } from 'react'

import type { InstallPlatform } from '../hooks/useAppHooks'
import { EmblemBadge, PrimaryButton, SecondaryButton } from './brand'
import { DownloadIcon, ShareIcon } from './icons'
import { Sheet } from './Sheet'

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-strong/25 text-xs font-bold text-primary-soft">
        {number}
      </span>
      <span className="text-sm leading-relaxed text-ink-muted">{children}</span>
    </li>
  )
}

export function InstallSheet({
  open,
  onClose,
  platform,
  canPrompt,
  isInstalled,
  onInstall,
}: {
  open: boolean
  onClose: () => void
  platform: InstallPlatform
  canPrompt: boolean
  isInstalled: boolean
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}) {
  const [working, setWorking] = useState(false)

  const handleInstall = async () => {
    setWorking(true)
    const outcome = await onInstall()
    setWorking(false)
    if (outcome === 'accepted') onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy="install-title" showClose>
      <div className="flex flex-col items-center text-center">
        <EmblemBadge size={64} />
        <h2 id="install-title" className="mt-3.5 font-display text-xl font-bold text-ink-primary">
          Instalar app
        </h2>

        {isInstalled ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Ganamos ya está instalada en este dispositivo. Podés abrirla desde tu pantalla de
              inicio.
            </p>
            <div className="mt-4 w-full">
              <SecondaryButton onClick={onClose}>Listo</SecondaryButton>
            </div>
          </>
        ) : platform === 'ios' ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              En iPhone o iPad, agregá Ganamos a tu pantalla de inicio desde Safari:
            </p>
            <ol className="mt-4 w-full space-y-3 text-left">
              <Step number={1}>Abrí esta página en Safari.</Step>
              <Step number={2}>
                <span className="inline-flex items-center gap-1.5">
                  Tocá el botón Compartir
                  <ShareIcon width={16} height={16} className="text-primary-soft" />
                  en la barra inferior.
                </span>
              </Step>
              <Step number={3}>Elegí “Agregar a pantalla de inicio”.</Step>
              <Step number={4}>Confirmá con “Agregar”.</Step>
            </ol>
            <div className="mt-4 w-full">
              <SecondaryButton onClick={onClose}>Entrar sin instalar</SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Instalá Ganamos como app para entrar más rápido y usar la pantalla completa, sin
              pasar por la tienda de aplicaciones.
            </p>

            {canPrompt ? (
              <div className="mt-4 w-full">
                <PrimaryButton
                  loading={working}
                  leadingIcon={<DownloadIcon width={20} height={20} />}
                  onClick={() => void handleInstall()}
                >
                  Instalar app
                </PrimaryButton>
              </div>
            ) : (
              <>
                <ol className="mt-4 w-full space-y-3 text-left">
                  <Step number={1}>Abrí el menú del navegador (⋮ o Compartir).</Step>
                  <Step number={2}>
                    Elegí “Instalar aplicación” o “Agregar a pantalla de inicio”.
                  </Step>
                  <Step number={3}>Confirmá la instalación.</Step>
                </ol>
                <p className="mt-3 w-full text-left text-xs leading-relaxed text-ink-subtle">
                  Si tu navegador no muestra esa opción, podés seguir usando Ganamos desde el
                  navegador.
                </p>
              </>
            )}

            <div className="mt-4 w-full">
              <SecondaryButton onClick={onClose}>Entrar sin instalar</SecondaryButton>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
