import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

import { copyText } from '../lib/clipboard'
import { CheckIcon, CopyIcon } from './icons'

/* ------------------------------------------------------------------ */
/* Fondo con iluminación radial violeta                                */
/* ------------------------------------------------------------------ */
export function GanamosBackground({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-dvh w-full overflow-x-hidden bg-bg-void"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 12%, rgba(139,92,246,0.22) 0%, rgba(124,58,237,0.09) 34%, transparent 62%), radial-gradient(circle at 88% 88%, rgba(124,58,237,0.16) 0%, transparent 48%)',
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Isotipo oficial                                                     */
/* ------------------------------------------------------------------ */
export function EmblemBadge({
  size = 76,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-[22px] border border-borderSubtle bg-surface shadow-emblem ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/img_ganamos_emblem.jpg"
        alt="Isotipo oficial de Ganamos"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Wordmark horizontal                                                 */
/* ------------------------------------------------------------------ */
export function GanamosWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label="Ganamos, ganamos.net"
    >
      <div
        className={`overflow-hidden rounded-[10px] border border-borderSubtle bg-surface-strong ${
          compact ? 'h-[30px] w-[30px]' : 'h-9 w-9'
        }`}
      >
        <img
          src="/img_ganamos_launcher.jpg"
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`font-display font-extrabold tracking-tight text-ink-primary ${
            compact ? 'text-base' : 'text-xl'
          }`}
        >
          GANAMOS
        </span>
        <span className="rounded-full border border-borderSubtle bg-primary-strong/30 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-soft">
          .net
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pills de estado                                                     */
/* ------------------------------------------------------------------ */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const STATUS_STYLES: Record<StatusTone, string> = {
  success: 'border-success-bright/35 bg-success/15 text-success-bright',
  warning: 'border-warning/35 bg-warning/15 text-warning',
  danger: 'border-danger/35 bg-danger/15 text-danger',
  neutral: 'border-borderSubtle bg-surface-strong text-ink-muted',
}

export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: StatusTone
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          tone === 'success'
            ? 'bg-success-bright'
            : tone === 'warning'
              ? 'bg-warning'
              : tone === 'danger'
                ? 'bg-danger'
                : 'bg-ink-muted'
        }`}
        aria-hidden
      />
      <span className="truncate">{children}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Botones                                                             */
/* ------------------------------------------------------------------ */
interface ButtonBaseProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  leadingIcon?: ReactNode
  className?: string
  type?: 'button' | 'submit'
  ariaLabel?: string
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  leadingIcon,
  className = '',
  type = 'button',
  ariaLabel,
  variant = 'primary',
}: ButtonBaseProps & { variant?: 'primary' | 'success' }) {
  const isSuccess = variant === 'success'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={`group relative flex min-h-[54px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-bold leading-tight text-ink-primary transition active:scale-[0.99] disabled:cursor-not-allowed disabled:text-ink-subtle ${
        disabled || loading
          ? 'bg-surface-strong shadow-none'
          : isSuccess
            ? 'bg-gradient-to-r from-success to-success-bright shadow-glowGreen hover:brightness-110'
            : 'bg-gradient-to-r from-primary-strong to-primary shadow-glow hover:brightness-110'
      } ${className}`}
    >
      {loading ? (
        <span
          className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
          aria-hidden
        />
      ) : (
        leadingIcon
      )}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  leadingIcon,
  className = '',
  type = 'button',
  ariaLabel,
}: ButtonBaseProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-borderSubtle bg-bg-elevated/85 px-4 py-3 text-sm font-semibold text-ink-primary transition hover:border-primary-soft/60 hover:bg-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:text-ink-subtle ${className}`}
    >
      {leadingIcon}
      <span className="truncate">{children}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Fila de credencial copiable                                         */
/* ------------------------------------------------------------------ */
export function CopyableCredentialRow({
  label,
  value,
  copyActionLabel,
  className = '',
}: {
  label: string
  value: string
  copyActionLabel: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const onCopy = async () => {
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-[14px] border bg-bg-void py-2 pl-3.5 pr-2 transition-colors ${
        copied ? 'border-success-bright/60' : 'border-borderSubtle'
      } ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
          {label}
        </p>
        <p className="truncate font-display text-base font-bold text-ink-primary">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-live="polite"
        className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
          copied
            ? 'border-success-bright/50 bg-success/20 text-success-bright'
            : 'border-borderSubtle bg-surface-strong text-ink-primary hover:border-primary-soft/60'
        }`}
      >
        {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
        <span>{copied ? '¡Copiado! ✓' : copyActionLabel}</span>
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Copiado compacto (icono + feedback)                                 */
/* ------------------------------------------------------------------ */
export function InlineCopyButton({
  value,
  label,
  className = '',
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const onCopy = async (event: MouseEvent) => {
    event.stopPropagation()
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-white/10 hover:text-primary-soft active:scale-95 ${className}`}
    >
      {copied ? (
        <CheckIcon width={16} height={16} className="text-success-bright" />
      ) : (
        <CopyIcon width={16} height={16} />
      )}
    </button>
  )
}
