import type { EphemeralCredentials, PlayerAccount } from '../types'
import {
  CopyableCredentialRow,
  GanamosBackground,
  PrimaryButton,
  StatusPill,
} from '../components/brand'
import { CheckIcon } from '../components/icons'

export function AccountCreatedScreen({
  account,
  credentials,
  onContinue,
}: {
  account: PlayerAccount
  credentials: EphemeralCredentials | null
  onContinue: () => void
}) {
  const isDemo = account.isDemo
  const temporaryPassword = credentials?.temporaryPassword

  return (
    <GanamosBackground>
      <main className="flex min-h-dvh w-full flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[440px] rounded-[24px] border border-success/45 bg-bg-elevated/95 px-[22px] py-[26px] shadow-floating">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-success shadow-[0_12px_30px_-8px_rgba(22,163,74,0.65)] animate-pop-in">
              <CheckIcon width={30} height={30} className="text-ink-primary" />
            </div>

            {isDemo && (
              <div className="mt-3.5">
                <StatusPill tone="warning">Modo demostración</StatusPill>
              </div>
            )}

            <h1 className="mt-3 font-display text-[26px] font-bold leading-tight text-ink-primary sm:text-[28px]">
              ¡Cuenta creada!
            </h1>

            {isDemo && (
              <p className="mt-1.5 text-xs leading-relaxed text-warning">
                Estás viendo una vista previa local. No crea cuentas reales ni habilita
                transferencias.
              </p>
            )}

            <div className="mt-5 w-full space-y-2.5 text-left">
              <CopyableCredentialRow
                label="USUARIO"
                value={credentials?.username ?? account.username}
                copyActionLabel="Copiar usuario"
              />

              {!isDemo && temporaryPassword?.trim() && (
                <>
                  <CopyableCredentialRow
                    label="CLAVE"
                    value={temporaryPassword}
                    copyActionLabel="Copiar clave"
                  />
                  <p className="px-1 text-center text-xs leading-relaxed text-ink-muted">
                    Guardala en un lugar seguro. Por seguridad, no se almacena en el disco del
                    dispositivo.
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 w-full">
              <PrimaryButton variant="success" onClick={onContinue}>
                Continuar a mi cuenta
              </PrimaryButton>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
              Guardá tus datos para volver a entrar cuando quieras
            </p>
          </div>
        </div>
      </main>
    </GanamosBackground>
  )
}
