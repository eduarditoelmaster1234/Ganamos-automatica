import { useState, type FormEvent } from 'react'

import { appConfig } from '../config/appConfig'
import { registerPlayer } from '../lib/api'
import { storage } from '../lib/storage'
import { NAME_ERROR_MESSAGES, validateName } from '../lib/validation'
import type { LegalDocumentType, RegistrationResult } from '../types'
import { EmblemBadge, GanamosBackground, PrimaryButton } from '../components/brand'
import { AlertIcon, LockIcon } from '../components/icons'

const LEGAL_LINKS: Array<{ type: LegalDocumentType; label: string }> = [
  { type: 'privacy', label: 'Privacidad' },
  { type: 'terms', label: 'Términos' },
  { type: 'cookies', label: 'Cookies' },
  { type: 'responsible', label: 'Juego Responsable' },
]

export function RegistrationScreen({
  online,
  onRegistered,
  onOpenLegal,
}: {
  online: boolean
  onRegistered: (result: RegistrationResult) => void
  onOpenLegal: (type: LegalDocumentType) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (submitting) return

    const validation = validateName(name)
    if (!validation.valid) {
      setError(NAME_ERROR_MESSAGES[validation.error])
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const result = await registerPlayer(validation.normalized, storage.getAttribution())
      onRegistered(result)
    } catch {
      setError('Ocurrió un problema al registrar tu cuenta. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <GanamosBackground>
      <main className="flex min-h-dvh w-full flex-col items-center justify-center px-4 py-5 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="w-full rounded-[24px] border border-borderSubtle bg-bg-elevated/95 px-[22px] py-7 shadow-floating">
            <div className="flex flex-col items-center">
              <EmblemBadge size={76} />

              <h1 className="mt-4 text-balance text-center font-display text-[26px] font-bold leading-tight text-ink-primary sm:text-[28px]">
                Creá tu <span className="text-primary-soft">cuenta gratis</span>
              </h1>

              <p
                className={`mt-1.5 text-center text-[15px] leading-relaxed ${
                  online ? 'text-ink-muted' : 'text-warning'
                }`}
              >
                {online ? 'Estamos Online 24hs!' : 'Sin conexión a internet'}
              </p>

              <form className="mt-5 w-full" onSubmit={handleSubmit} noValidate>
                <label htmlFor="register-name" className="sr-only">
                  Nombre o apodo
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  inputMode="text"
                  autoComplete="nickname"
                  autoCapitalize="words"
                  spellCheck={false}
                  maxLength={40}
                  value={name}
                  disabled={submitting}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError(null)
                  }}
                  placeholder="Ingresá tu nombre o apodo"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-name-error' : undefined}
                  className={`h-[54px] w-full rounded-[14px] border bg-bg-void px-4 text-[15px] text-ink-primary outline-none transition placeholder:text-ink-subtle disabled:opacity-60 ${
                    error
                      ? 'border-danger focus:border-danger'
                      : 'border-borderSubtle focus:border-borderFocus focus:shadow-[0_0_0_3px_rgba(192,132,252,0.18)]'
                  }`}
                />

                <div aria-live="polite" className="min-h-0">
                  {error && (
                    <p
                      id="register-name-error"
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-danger animate-fade-in"
                    >
                      <AlertIcon width={16} height={16} className="shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}
                </div>

                <div className="mt-3.5">
                  <PrimaryButton type="submit" loading={submitting}>
                    {submitting ? 'CREANDO CUENTA…' : 'CREAR MI CUENTA · +18'}
                  </PrimaryButton>
                </div>
              </form>

              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-ink-subtle">
                <LockIcon width={14} height={14} className="shrink-0" />
                <span className="text-xs">Registro seguro · sin tarjeta · gratis</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-2">
            {LEGAL_LINKS.map((link) => (
              <button
                key={link.type}
                type="button"
                onClick={() => onOpenLegal(link.type)}
                className="min-h-[44px] px-1.5 text-xs font-medium text-ink-muted underline underline-offset-4 transition hover:text-primary-soft"
              >
                {link.label}
              </button>
            ))}
          </div>

          <p className="mt-1.5 px-3 text-center text-xs leading-relaxed text-ink-subtle">
            {appConfig.jurisdictionNotice}
          </p>
        </div>
      </main>
    </GanamosBackground>
  )
}
