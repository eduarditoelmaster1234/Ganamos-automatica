import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { CloseIcon } from './icons'

export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
  maxWidth = 'sm:max-w-[440px]',
  showClose = false,
  closeLabel = 'Cerrar',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  maxWidth?: string
  showClose?: boolean
  closeLabel?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 30)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      previousFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative z-10 max-h-[92dvh] w-full overflow-y-auto outline-none thin-scrollbar rounded-t-[26px] border border-borderSubtle bg-bg-elevated px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3 shadow-floating animate-sheet-up sm:mb-0 sm:rounded-[26px] sm:p-6 sm:animate-pop-in ${maxWidth}`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-subtle/40 sm:hidden" aria-hidden />
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-white/5 hover:text-ink-primary"
          >
            <CloseIcon width={20} height={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
