import { appConfig } from '../config/appConfig'
import type { NotificationPermissionStatus } from '../types'
import { EmblemBadge, PrimaryButton, SecondaryButton, StatusPill } from './brand'
import { BellOffIcon, BellIcon } from './icons'
import { Sheet } from './Sheet'

export function NotificationsSheet({
  open,
  status,
  onRequest,
  onDismissForNow,
  onClose,
}: {
  open: boolean
  status: NotificationPermissionStatus
  onRequest: () => void
  onDismissForNow: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="notifications-title" showClose>
      <div className="mb-1.5 flex items-center justify-between pr-10">
        <span className="text-xs font-semibold tracking-wide text-primary-soft">
          {appConfig.domain}
        </span>
      </div>

      <div className="flex flex-col items-center pt-1 text-center">
        <EmblemBadge size={64} />
        <div className="mt-3.5 w-full">
          {status === 'granted' && (
            <>
              <StatusPill tone="success">Notificaciones activadas</StatusPill>
              <h2
                id="notifications-title"
                className="mt-2.5 font-display text-xl font-bold text-ink-primary"
              >
                Notificaciones activadas
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                El permiso de notificaciones del sistema está habilitado. Cuando el backend de
                alertas esté conectado, podrás recibir avisos de soporte y novedades de tu cuenta.
              </p>
              <div className="mt-5">
                <SecondaryButton onClick={onClose}>Listo</SecondaryButton>
              </div>
            </>
          )}

          {status === 'denied' && (
            <>
              <StatusPill tone="warning">Permiso desactivado</StatusPill>
              <h2
                id="notifications-title"
                className="mt-2.5 font-display text-xl font-bold text-ink-primary"
              >
                Permiso de notificaciones desactivado
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Podés habilitar las notificaciones en cualquier momento desde la configuración
                del sitio en tu navegador.
              </p>
              <div className="mt-3.5 w-full rounded-2xl border border-borderSubtle bg-surface p-3.5 text-left">
                <div className="flex items-start gap-2.5">
                  <BellOffIcon width={20} height={20} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Configuración del navegador → Permisos del sitio → Notificaciones → Permitir.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <PrimaryButton leadingIcon={<BellIcon width={20} height={20} />} onClick={onRequest}>
                  Reintentar permiso
                </PrimaryButton>
              </div>
              <button
                type="button"
                onClick={onDismissForNow}
                className="mt-2 min-h-[44px] w-full text-sm font-medium text-ink-muted transition hover:text-ink-primary"
              >
                Ahora no
              </button>
            </>
          )}

          {status === 'default' && (
            <>
              <h2
                id="notifications-title"
                className="font-display text-xl font-bold text-ink-primary"
              >
                Activar notificaciones
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Usaremos este permiso únicamente para avisarte sobre respuestas del chat de
                soporte y actualizaciones importantes de tu cuenta.
              </p>
              <div className="mt-4">
                <PrimaryButton leadingIcon={<BellIcon width={20} height={20} />} onClick={onRequest}>
                  Activar notificaciones
                </PrimaryButton>
              </div>
              <button
                type="button"
                onClick={onDismissForNow}
                className="mt-2 min-h-[44px] w-full text-sm font-medium text-ink-muted transition hover:text-ink-primary"
              >
                Ahora no
              </button>
            </>
          )}

          {status === 'unsupported' && (
            <>
              <h2
                id="notifications-title"
                className="font-display text-xl font-bold text-ink-primary"
              >
                Notificaciones no disponibles
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                Este navegador o perfil del sistema no admite notificaciones para esta
                aplicación.
              </p>
              <div className="mt-4">
                <SecondaryButton onClick={onClose}>Cerrar</SecondaryButton>
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
