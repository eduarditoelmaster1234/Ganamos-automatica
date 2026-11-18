import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

import { appConfig, isBankDetailsConfigured } from '../config/appConfig'
import { copyText } from '../lib/clipboard'
import { sendChatMessageToServer, uploadReceiptToServer } from '../lib/api'
import type {
  ChatConnectionStatus,
  ChatMessage,
  EphemeralCredentials,
  PlayerAccount,
  ReceiptAttachment,
  ReceiptUploadState,
} from '../types'
import { CloseIcon, FileIcon, ImageIcon, SendIcon, AttachIcon, UploadIcon, CheckCircleIcon, AlertIcon } from './icons'

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const STATUS_COPY: Record<ChatConnectionStatus, { label: string; dot: string }> = {
  online: { label: 'en línea', dot: 'bg-success-bright' },
  connecting: { label: 'conectando…', dot: 'bg-warning' },
  offline: { label: 'sin conexión', dot: 'bg-danger' },
  demo: { label: 'modo demostración', dot: 'bg-warning' },
  pending: { label: 'configuración pendiente', dot: 'bg-[#D1D5DB]' },
}

const BANNER_COPY: Record<ChatConnectionStatus, string> = {
  online: 'Conectado. Escribinos y te respondemos.',
  connecting: 'Canal pendiente de configuración del servidor.',
  offline: 'Sin conexión a internet. Revisá tu red.',
  demo: 'Modo demostración · Sin conexión con el servidor real.',
  pending: 'Canal pendiente de configuración del servidor.',
}

function formatByteSize(bytes: number): string {
  if (bytes <= 0) return 'Tamaño desconocido'
  const kb = bytes / 1024
  return kb < 1024 ? `${Math.trunc(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

function resolveMime(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

function nowLabel(): string {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function SupportChat({
  account,
  credentials,
  online,
  backendReachable,
  backendChecking,
  canInstall,
  onMinimize,
  onRequestInstall,
}: {
  account: PlayerAccount
  credentials: EphemeralCredentials | null
  online: boolean
  backendReachable: boolean
  backendChecking: boolean
  canInstall: boolean
  onMinimize: () => void
  onRequestInstall: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptUploadState>({ kind: 'none' })
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const copyTimer = useRef<number | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const bankDetails = appConfig.bankDetails
  const bankConfigured = isBankDetailsConfigured(bankDetails)

  const connection: ChatConnectionStatus = useMemo(() => {
    if (!online) return 'offline'
    if (account.isDemo) return 'demo'
    if (backendChecking) return 'connecting'
    if (backendReachable) return 'online'
    return 'pending'
  }, [online, account.isDemo, backendChecking, backendReachable])

  const canSend = composer.trim().length > 0 && !sending

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, receipt.kind])

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  const addMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message])
  }

  const addSystemInfo = (text: string) => {
    addMessage({
      id: messageId('local-info'),
      sender: 'system',
      text,
      timestampLabel: 'Información',
      deliveryStatus: 'sent',
    })
  }

  const handleCopy = async (field: 'cbu' | 'alias') => {
    const value = field === 'cbu' ? bankDetails.cbu : bankDetails.alias
    const ok = await copyText(value)
    if (!ok) return
    setCopiedField(field)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopiedField(null), 2000)
  }

  const sendMessage = async (textOverride?: string, topic?: string) => {
    const text = (textOverride ?? composer).trim()
    if (!text || sending) return

    if (connection !== 'online') {
      addMessage({
        id: messageId('local'),
        sender: 'user',
        text,
        timestampLabel: 'Guardado localmente',
        deliveryStatus: 'local',
      })
      if (!textOverride) setComposer('')
      return
    }

    const temporaryId = messageId('pending')
    addMessage({
      id: temporaryId,
      sender: 'user',
      text,
      timestampLabel: 'Enviando…',
      deliveryStatus: 'sending',
    })
    if (!textOverride) setComposer('')
    setSending(true)

    const result = await sendChatMessageToServer(text, topic, account.id)
    setSending(false)

    setMessages((current) =>
      current.map((message) => {
        if (message.id !== temporaryId) return message
        if (result) return result
        return {
          ...message,
          timestampLabel: 'Sin conexión',
          deliveryStatus: 'failed',
        }
      }),
    )
  }

  const handleQuickAction = (action: 'deposit' | 'withdraw' | 'support') => {
    const promptText =
      action === 'deposit'
        ? 'Quiero consultar los pasos para cargar saldo.'
        : action === 'withdraw'
          ? 'Quiero consultar los requisitos para retirar.'
          : 'Necesito ayuda de soporte.'

    if (connection === 'online') {
      void sendMessage(promptText, action)
      return
    }

    let guidance: string
    if (action === 'deposit') {
      guidance = bankConfigured
        ? `Para cargar, verificá los datos vigentes en la tarjeta superior (Titular: ${bankDetails.accountHolder}) y luego adjuntá tu comprobante cuando el servidor de soporte esté en línea.`
        : 'Las instrucciones de carga estarán disponibles en cuanto el operador configure los datos bancarios y el canal de soporte en línea.'
    } else if (action === 'withdraw') {
      guidance =
        'Para solicitar un retiro, soporte te pedirá confirmar tu usuario y un CBU/CVU o alias a tu nombre. Nunca compartas contraseñas ni códigos de verificación.'
    } else {
      guidance =
        'El canal de soporte en vivo todavía no está conectado en este entorno. Podés revisar los avisos legales o intentar nuevamente cuando el servidor esté disponible.'
    }
    addSystemInfo(guidance)
  }

  const onPickReceipt = () => {
    fileInputRef.current?.click()
  }

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setShowAttachmentOptions(false)
    const mimeType = resolveMime(file)

    const attachment: ReceiptAttachment = {
      file,
      displayName: file.name || 'comprobante',
      mimeType,
      sizeBytes: file.size,
    }

    if (!ALLOWED_MIMES.has(mimeType)) {
      setReceipt({
        kind: 'error',
        attachment,
        message: 'Formato no compatible. Usá JPG, PNG o PDF.',
      })
      return
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      setReceipt({
        kind: 'error',
        attachment,
        message: 'El archivo supera el límite de 10 MB.',
      })
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = mimeType.startsWith('image/') ? URL.createObjectURL(file) : null

    setReceipt({
      kind: 'selected',
      attachment: { ...attachment, previewUrl: previewUrlRef.current ?? undefined },
    })
  }

  const clearReceipt = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setReceipt({ kind: 'none' })
  }

  const submitReceipt = async () => {
    if (receipt.kind !== 'selected' && receipt.kind !== 'error') return
    const attachment = receipt.attachment
    setReceipt({ kind: 'uploading', attachment })

    if (connection === 'online') {
      const result = await uploadReceiptToServer(attachment, account.id)
      if (result.ok) {
        setReceipt({ kind: 'sent', attachment, locally: false })
        addMessage({
          id: messageId('receipt'),
          sender: 'user',
          text: 'Comprobante enviado para revisión',
          timestampLabel: 'Recibido por el servidor',
          deliveryStatus: 'sent',
          attachmentName: attachment.displayName,
        })
      } else {
        setReceipt({
          kind: 'error',
          attachment,
          message:
            result.message ?? 'No se pudo enviar el archivo. Podés intentarlo nuevamente.',
        })
      }
      return
    }

    setReceipt({ kind: 'sent', attachment, locally: true })
    addMessage({
      id: messageId('receipt-local'),
      sender: 'user',
      text: 'Comprobante guardado en este dispositivo',
      timestampLabel: 'Sin conexión con el servidor',
      deliveryStatus: 'local',
      attachmentName: attachment.displayName,
    })
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) void sendMessage()
    }
  }

  const statusCopy = STATUS_COPY[connection]

  return (
    <section
      aria-label="Chat de soporte"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[86dvh] flex-col overflow-hidden rounded-t-[20px] bg-wa-cream shadow-floating animate-sheet-up min-[720px]:inset-x-auto min-[720px]:bottom-4 min-[720px]:right-4 min-[720px]:h-auto min-[720px]:max-h-[78vh] min-[720px]:w-[368px] min-[720px]:rounded-[20px] min-[720px]:animate-pop-in"
    >
      {/* Header estilo WhatsApp */}
      <header className="flex shrink-0 items-center justify-between gap-2 bg-wa-header px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-wa-avatar text-base font-bold text-white">
            G
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold leading-tight text-white">Chat</h2>
            <div className="flex items-center gap-1.5">
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${statusCopy.dot}`} aria-hidden />
              <span className="truncate text-[11px] text-white/90">{statusCopy.label}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimizar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
        >
          <CloseIcon width={22} height={22} />
        </button>
      </header>

      {/* Conversación */}
      <div className="thin-scrollbar chat-pattern min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex justify-center">
          <span className="rounded-[10px] bg-wa-banner px-3 py-1.5 text-center text-[11px] font-medium text-wa-bannerText shadow-sm">
            {BANNER_COPY[connection]}
          </span>
        </div>

        <TransferBubble
          configured={bankConfigured}
          minimumDepositLabel={bankDetails.minimumDepositLabel}
          cbu={bankDetails.cbu}
          alias={bankDetails.alias}
          accountHolder={bankDetails.accountHolder}
          copiedField={copiedField}
          onCopy={handleCopy}
          onUpload={onPickReceipt}
        />

        <div className="mt-2.5 space-y-2.5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        <div ref={scrollAnchorRef} className="h-px w-full" aria-hidden />
      </div>

      {/* Preview de comprobante */}
      <ReceiptPreviewStrip
        state={receipt}
        onClear={clearReceipt}
        onUpload={() => void submitReceipt()}
      />

      {/* Opciones de adjunto */}
      {showAttachmentOptions && (
        <div className="flex shrink-0 gap-2 border-t border-wa-divider bg-white px-3 py-2">
          <button
            type="button"
            onClick={onPickReceipt}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-wa-action px-2 text-xs font-semibold text-wa-action"
          >
            <ImageIcon width={16} height={16} />
            Galería / Foto
          </button>
          <button
            type="button"
            onClick={onPickReceipt}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-wa-action px-2 text-xs font-semibold text-wa-action"
          >
            <FileIcon width={16} height={16} />
            PDF / Archivo
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={onFileSelected}
        aria-label="Adjuntar comprobante"
      />

      <div className="shrink-0 border-t border-wa-divider" />

      {/* Acciones rápidas */}
      <div className="flex shrink-0 gap-1.5 bg-wa-composer px-2.5 py-2">
        <button
          type="button"
          onClick={() => handleQuickAction('deposit')}
          className="min-h-[44px] flex-1 rounded-[10px] bg-success px-1.5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          CARGAR
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('withdraw')}
          className="min-h-[44px] flex-1 rounded-[10px] border border-wa-action bg-white px-1.5 py-2 text-[11px] font-bold text-wa-action transition hover:bg-wa-action/5 active:scale-[0.98]"
        >
          RETIRAR
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('support')}
          className="min-h-[44px] flex-1 rounded-[10px] border border-wa-action bg-white px-1.5 py-2 text-[11px] font-bold text-wa-action transition hover:bg-wa-action/5 active:scale-[0.98]"
        >
          SOPORTE
        </button>
      </div>

      {/* Instalar app */}
      {canInstall && (
        <div className="shrink-0 bg-wa-composer px-2.5 pb-2">
          <button
            type="button"
            onClick={onRequestInstall}
            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-wa-action/40 bg-white px-3 text-xs font-semibold text-wa-action transition hover:bg-wa-action/5 active:scale-[0.99]"
          >
            <span aria-hidden>📲</span> Instalar app
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="flex shrink-0 items-center gap-1.5 bg-wa-composer px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-0.5">
        <button
          type="button"
          onClick={() => setShowAttachmentOptions((current) => !current)}
          aria-label="Adjuntar comprobante"
          aria-expanded={showAttachmentOptions}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-wa-secondary transition hover:bg-black/5"
        >
          <AttachIcon width={22} height={22} />
        </button>

        <div className="flex min-h-[46px] min-w-0 flex-1 items-center rounded-[24px] border border-wa-divider bg-white px-3.5">
          <input
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Escribí un mensaje…"
            aria-label="Escribí un mensaje"
            maxLength={1000}
            className="h-[46px] w-full bg-transparent text-sm text-wa-text outline-none placeholder:text-wa-secondary"
          />
        </div>

        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${
            canSend ? 'bg-success hover:brightness-110' : 'cursor-not-allowed bg-wa-avatar/45'
          }`}
        >
          {sending ? (
            <span
              className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white"
              aria-hidden
            />
          ) : (
            <SendIcon width={20} height={20} />
          )}
        </button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Burbuja de transferencia                                            */
/* ------------------------------------------------------------------ */
function TransferBubble({
  configured,
  minimumDepositLabel,
  cbu,
  alias,
  accountHolder,
  copiedField,
  onCopy,
  onUpload,
}: {
  configured: boolean
  minimumDepositLabel: string
  cbu: string
  alias: string
  accountHolder: string
  copiedField: string | null
  onCopy: (field: 'cbu' | 'alias') => void
  onUpload: () => void
}) {
  return (
    <article className="mt-2.5 w-full rounded-b-2xl rounded-tl-md rounded-tr-2xl bg-white p-3 shadow-sm">
      <p className="text-sm leading-snug text-wa-text">
        Transferí a estos datos y después subí el comprobante 👇
      </p>

      {configured ? (
        <>
          {minimumDepositLabel && (
            <p className="mt-2 text-xs font-semibold text-wa-text">
              Monto mínimo de carga: {minimumDepositLabel}
            </p>
          )}

          <div className="mt-2 space-y-2 rounded-[10px] bg-wa-subcard px-2.5 py-2.5">
            <BankRow label="CBU" value={cbu} />
            <BankRow label="Alias" value={alias} />
            <BankRow label="Titular" value={accountHolder} />
          </div>

          <p className="mt-2 text-[11px] leading-snug text-wa-secondary">
            Verificá siempre el titular antes de transferir. La acreditación depende de la
            validación del operador.
          </p>

          <div className="mt-2 space-y-2">
            <CopyOutlineButton
              text={copiedField === 'cbu' ? '¡Copiado! ✓' : 'Copiar CBU'}
              onClick={() => onCopy('cbu')}
              highlighted={copiedField === 'cbu'}
            />
            <CopyOutlineButton
              text={copiedField === 'alias' ? '¡Copiado! ✓' : 'Copiar ALIAS'}
              onClick={() => onCopy('alias')}
              highlighted={copiedField === 'alias'}
            />
          </div>
        </>
      ) : (
        <div className="mt-2 rounded-[10px] bg-wa-subcard p-2.5">
          <p className="text-xs leading-relaxed text-wa-secondary">
            Los datos bancarios aún no fueron configurados por el operador en AppConfig /
            servidor.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onUpload}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-success px-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
      >
        <ImageIcon width={18} height={18} />
        SUBIR COMPROBANTE
      </button>
    </article>
  )
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[11px] font-medium text-wa-secondary">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-bold text-wa-text">{value}</span>
    </div>
  )
}

function CopyOutlineButton({
  text,
  onClick,
  highlighted,
}: {
  text: string
  onClick: () => void
  highlighted: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[46px] w-full items-center justify-center rounded-[10px] border px-3 text-sm font-semibold transition active:scale-[0.99] ${
        highlighted
          ? 'border-success-bright/60 bg-success/10 text-success'
          : 'border-wa-action bg-white text-wa-action hover:bg-wa-action/5'
      }`}
    >
      {text}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Burbujas de mensajes                                                */
/* ------------------------------------------------------------------ */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user'
  const timestampColor =
    message.deliveryStatus === 'failed'
      ? 'text-danger'
      : message.deliveryStatus === 'sending' || message.deliveryStatus === 'local'
        ? 'text-warning'
        : 'text-wa-secondary'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded px-3 py-2 shadow-sm ${
          isUser
            ? 'rounded-tl-[14px] rounded-tr-[4px] rounded-b-[14px] bg-wa-outgoing'
            : 'rounded-tl-[4px] rounded-tr-[14px] rounded-b-[14px] bg-white'
        }`}
      >
        {message.attachmentName && (
          <p className="mb-0.5 text-[11px] font-bold text-wa-action">
            Comprobante: {message.attachmentName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-snug text-wa-text">
          {message.text}
        </p>
        {message.timestampLabel && (
          <p className={`mt-0.5 text-right text-[10px] ${timestampColor}`}>
            {message.timestampLabel}
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Preview del comprobante seleccionado                                */
/* ------------------------------------------------------------------ */
function ReceiptPreviewStrip({
  state,
  onClear,
  onUpload,
}: {
  state: ReceiptUploadState
  onClear: () => void
  onUpload: () => void
}) {
  if (state.kind === 'none') return null
  const attachment = state.attachment
  const isImage = attachment.mimeType.startsWith('image/')

  return (
    <div className="shrink-0 border-t border-wa-divider bg-white px-3 py-2">
      <div className="flex items-center gap-2.5">
        {isImage && attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.displayName}
            className="h-[42px] w-[42px] shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-wa-subcard text-wa-action">
            <FileIcon width={20} height={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-wa-text">{attachment.displayName}</p>
          <p className="text-[11px] text-wa-secondary">{formatByteSize(attachment.sizeBytes)}</p>
        </div>

        {state.kind !== 'uploading' && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Cancelar adjunto"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-wa-secondary transition hover:bg-black/5"
          >
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>

      {state.kind === 'selected' && (
        <button
          type="button"
          onClick={onUpload}
          className="mt-1.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-success px-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <UploadIcon width={18} height={18} />
          Enviar comprobante
        </button>
      )}

      {state.kind === 'uploading' && (
        <div className="mt-1.5 flex items-center gap-2 py-1">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-wa-action/30 border-t-wa-action" />
          <span className="text-xs text-wa-secondary">Enviando comprobante…</span>
        </div>
      )}

      {state.kind === 'sent' && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <CheckCircleIcon
            width={16}
            height={16}
            className={`mt-0.5 shrink-0 ${state.locally ? 'text-warning' : 'text-success'}`}
          />
          <span
            className={`text-xs leading-snug ${state.locally ? 'text-warning' : 'text-wa-action'}`}
          >
            {state.locally
              ? 'Comprobante guardado en este dispositivo. No se envió al servidor.'
              : 'Comprobante recibido por el servidor'}
          </span>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-1.5">
            <AlertIcon width={16} height={16} className="mt-0.5 shrink-0 text-danger" />
            <span className="text-xs leading-snug text-danger">{state.message}</span>
          </div>
          <button
            type="button"
            onClick={onUpload}
            className="shrink-0 px-1 text-xs font-semibold text-wa-action underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
