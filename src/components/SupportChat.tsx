import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { appConfig, isBankDetailsConfigured } from '../config/appConfig'
import { copyText } from '../lib/clipboard'
import { getPlayerBalance, sendChatMessageToServer, uploadReceiptToServer } from '../lib/api'
import { storage } from '../lib/storage'
import type {
  ChatConnectionStatus,
  ChatMessage,
  ChatTimelineItem,
  EphemeralCredentials,
  PlayerAccount,
  PlayerBalance,
  ReceiptAttachment,
  ReceiptUploadState,
} from '../types'
import {
  AlertIcon,
  AttachIcon,
  CheckCircleIcon,
  CloseIcon,
  FileIcon,
  ImageIcon,
  SendIcon,
  UploadIcon,
} from './icons'

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

type WithdrawBalance =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'available'; formatted: string; amount: number }
  | { status: 'stale'; formatted: string; amount: number }

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

function deriveBalance(
  data: PlayerBalance | undefined,
  isPending: boolean,
  isError: boolean,
): WithdrawBalance {
  if (data) {
    const amount = data.balance
    const formatted = arsFormatter.format(amount)
    const stale = isError || data.stale
    return stale
      ? { status: 'stale', formatted, amount }
      : { status: 'available', formatted, amount }
  }
  if (isPending) return { status: 'loading' }
  return { status: isError ? 'unavailable' : 'loading' }
}

type WithdrawDelivery = 'sent' | 'local' | 'failed'

export function SupportChat({
  account,
  credentials,
  online,
  backendReachable,
  backendChecking,
  open,
  canInstall,
  onMinimize,
  onInstallClick,
}: {
  account: PlayerAccount
  credentials: EphemeralCredentials | null
  online: boolean
  backendReachable: boolean
  backendChecking: boolean
  open: boolean
  canInstall: boolean
  onMinimize: () => void
  onInstallClick: () => void
}) {
  // La tarjeta de CARGAR se inserta una sola vez al abrir el chat.
  const [timeline, setTimeline] = useState<ChatTimelineItem[]>(() => [
    { kind: 'deposit-card', id: 'deposit-card' },
  ])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptUploadState>({ kind: 'none' })
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [depositFlash, setDepositFlash] = useState(false)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const depositRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const copyTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const messageUrlsRef = useRef<string[]>([])
  const didInitialScroll = useRef(false)
  const savedScrollTop = useRef(0)
  const wasOpen = useRef(open)

  const bankDetails = appConfig.bankDetails
  const bankConfigured = isBankDetailsConfigured(bankDetails)

  const hasWithdrawCard = withdrawId !== null
  const hasServerAccount = account.source === 'server' && Boolean(storage.getPlayerToken())

  const balanceQuery = useQuery({
    queryKey: ['player-balance', account.id],
    queryFn: () => getPlayerBalance(),
    enabled: open && hasServerAccount,
    placeholderData: keepPreviousData,
    refetchInterval: open && hasServerAccount ? (hasWithdrawCard ? 3000 : 15000) : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const withdrawBalance: WithdrawBalance = hasServerAccount
    ? deriveBalance(balanceQuery.data, balanceQuery.isPending, balanceQuery.isError)
    : { status: 'unavailable' }

  // Consulta inmediata al abrir el chat (y al reabrir desde el widget).
  useEffect(() => {
    if (open && hasServerAccount) void balanceQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const connection: ChatConnectionStatus = useMemo(() => {
    if (!online) return 'offline'
    if (account.isDemo) return 'demo'
    if (backendChecking) return 'connecting'
    if (backendReachable) return 'online'
    return 'pending'
  }, [online, account.isDemo, backendChecking, backendReachable])

  const canSend = composer.trim().length > 0 && !sending
  const statusCopy = STATUS_COPY[connection]

  useEffect(() => {
    if (!didInitialScroll.current) {
      didInitialScroll.current = true
      scrollRef.current?.scrollTo({ top: 0 })
      return
    }
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [timeline.length, receipt.kind])

  // Guardamos la posición con cada scroll (display:none resetea scrollTop)
  // y la restauramos al reabrir el chat.
  useEffect(() => {
    if (!wasOpen.current && open) {
      const top = savedScrollTop.current
      window.requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = top
      })
    }
    wasOpen.current = open
  }, [open])

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      for (const url of messageUrlsRef.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const appendMessage = (message: ChatMessage) => {
    setTimeline((current) => [...current, { kind: 'message', message }])
  }

  const updateMessage = (
    id: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setTimeline((current) =>
      current.map((item) =>
        item.kind === 'message' && item.message.id === id
          ? { kind: 'message', message: updater(item.message) }
          : item,
      ),
    )
  }

  const addSystemInfo = (text: string) => {
    appendMessage({
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
      appendMessage({
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
    appendMessage({
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

    updateMessage(temporaryId, (message) =>
      result ?? { ...message, timestampLabel: 'Sin conexión', deliveryStatus: 'failed' },
    )
  }

  const showDepositCard = () => {
    setTimeline((current) =>
      current.some((item) => item.kind === 'deposit-card')
        ? current
        : [{ kind: 'deposit-card', id: messageId('deposit') }, ...current],
    )
    setDepositFlash(true)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setDepositFlash(false), 1400)
    window.requestAnimationFrame(() => {
      depositRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const showWithdrawCard = () => {
    if (withdrawId) {
      document
        .getElementById(withdrawId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const id = messageId('withdraw')
    setWithdrawId(id)
    setTimeline((current) => [...current, { kind: 'withdraw-card', id }])
    // El saldo se actualiza inmediatamente al abrir RETIRAR.
    if (hasServerAccount) void balanceQuery.refetch()
  }

  const handleQuickAction = (action: 'deposit' | 'withdraw' | 'support') => {
    if (action === 'deposit') {
      showDepositCard()
      return
    }
    if (action === 'withdraw') {
      showWithdrawCard()
      return
    }

    if (connection === 'online') {
      void sendMessage('Necesito ayuda de soporte.', 'support')
      return
    }

    addSystemInfo(
      'El canal de soporte en vivo todavía no está conectado en este entorno. Podés revisar los avisos legales o intentar nuevamente cuando el servidor esté disponible.',
    )
  }

  const submitWithdrawalRequest = async (text: string): Promise<WithdrawDelivery> => {
    if (connection !== 'online') {
      appendMessage({
        id: messageId('withdraw-local'),
        sender: 'user',
        text,
        timestampLabel: 'Guardado localmente',
        deliveryStatus: 'local',
      })
      return 'local'
    }

    const temporaryId = messageId('withdraw-pending')
    appendMessage({
      id: temporaryId,
      sender: 'user',
      text,
      timestampLabel: 'Enviando…',
      deliveryStatus: 'sending',
    })

    const result = await sendChatMessageToServer(text, 'withdraw', account.id)
    if (result) {
      updateMessage(temporaryId, () => result)
      return 'sent'
    }

    updateMessage(temporaryId, (message) => ({
      ...message,
      timestampLabel: 'Sin conexión',
      deliveryStatus: 'failed',
    }))
    return 'failed'
  }

  const handleWithdrawSubmit = async (text: string): Promise<WithdrawDelivery> => {
    const result = await submitWithdrawalRequest(text)
    if (result !== 'failed') {
      // Permite pedir un retiro nuevo más adelante sin reutilizar este formulario.
      setWithdrawId(null)
    }
    return result
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
        message: 'Formato no compatible. Usá JPG, PNG, WEBP o PDF.',
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

    // La URL de la imagen elegida pasa a ser propiedad del mensaje del hilo.
    const imageUrl = attachment.previewUrl
    if (imageUrl) {
      messageUrlsRef.current.push(imageUrl)
      previewUrlRef.current = null
    }

    if (connection === 'online') {
      const result = await uploadReceiptToServer(attachment, account.id)
      if (result.ok) {
        setReceipt({ kind: 'sent', attachment, locally: false })
        appendMessage({
          id: messageId('receipt'),
          sender: 'user',
          text: 'Comprobante enviado para revisión',
          timestampLabel: 'Recibido por el servidor',
          deliveryStatus: 'sent',
          attachmentName: attachment.displayName,
          imagePreviewUrl: imageUrl,
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
    appendMessage({
      id: messageId('receipt-local'),
      sender: 'user',
      text: 'Comprobante guardado en este dispositivo',
      timestampLabel: 'Recepción local · sin servidor',
      deliveryStatus: 'local',
      attachmentName: attachment.displayName,
      imagePreviewUrl: imageUrl,
    })
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) void sendMessage()
    }
  }

  return (
    <section
      aria-label="Chat de soporte"
      aria-hidden={!open}
      className={`fixed inset-x-0 bottom-0 z-50 ${
        open ? 'flex animate-sheet-up' : 'hidden'
      } h-[86dvh] flex-col overflow-hidden rounded-t-[20px] bg-wa-cream shadow-floating min-[720px]:inset-x-auto min-[720px]:bottom-4 min-[720px]:right-4 min-[720px]:h-auto min-[720px]:max-h-[calc(100dvh-32px)] min-[720px]:w-[368px] min-[720px]:rounded-[20px] min-[720px]:animate-pop-in`}
    >
      {/* Header estilo WhatsApp */}
      <header className="flex shrink-0 items-center justify-between gap-2 bg-wa-header px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/dog-avatar.jpg"
            alt="Avatar de Ganamos"
            width={38}
            height={38}
            draggable={false}
            className="h-[38px] w-[38px] shrink-0 rounded-full object-cover ring-1 ring-white/25"
          />
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold leading-tight text-white">Chat</h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${statusCopy.dot}`}
                aria-hidden
              />
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
      <div
        ref={scrollRef}
        onScroll={(event) => {
          savedScrollTop.current = event.currentTarget.scrollTop
        }}
        className="thin-scrollbar chat-pattern min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="flex justify-center">
          <span className="rounded-[10px] bg-wa-banner px-3 py-1.5 text-center text-[11px] font-medium text-wa-bannerText shadow-sm">
            {BANNER_COPY[connection]}
          </span>
        </div>

        <div className="mt-2.5 space-y-2.5">
          {timeline.map((item) => {
            if (item.kind === 'deposit-card') {
              return (
                <div key={item.id} ref={depositRef}>
                  <DepositCard
                    configured={bankConfigured}
                    minimumDepositLabel={bankDetails.minimumDepositLabel}
                    cbu={bankDetails.cbu}
                    alias={bankDetails.alias}
                    accountHolder={bankDetails.accountHolder}
                    copiedField={copiedField}
                    flash={depositFlash}
                    onCopy={handleCopy}
                    onUpload={onPickReceipt}
                  />
                </div>
              )
            }

            if (item.kind === 'withdraw-card') {
              return (
                <div key={item.id} id={item.id}>
                  <WithdrawCard
                    minimumAmount={appConfig.withdrawals.minimumAmount}
                    minimumLabel={appConfig.withdrawals.minimumLabel}
                    balance={withdrawBalance}
                    onSubmit={handleWithdrawSubmit}
                  />
                </div>
              )
            }

            return <MessageBubble key={item.message.id} message={item.message} />
          })}
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
            onClick={onInstallClick}
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
/* Tarjeta de CARGAR                                                   */
/* ------------------------------------------------------------------ */
function DepositCard({
  configured,
  minimumDepositLabel,
  cbu,
  alias,
  accountHolder,
  copiedField,
  flash,
  onCopy,
  onUpload,
}: {
  configured: boolean
  minimumDepositLabel: string
  cbu: string
  alias: string
  accountHolder: string
  copiedField: string | null
  flash: boolean
  onCopy: (field: 'cbu' | 'alias') => void
  onUpload: () => void
}) {
  return (
    <article
      className={`w-full rounded-b-2xl rounded-tl-md rounded-tr-2xl bg-white p-3 shadow-sm ring-2 transition ${
        flash ? 'ring-success-bright/60' : 'ring-transparent'
      }`}
    >
      <p className="text-sm leading-snug text-wa-text">
        Transferí a estos datos y después subí el comprobante 👇
      </p>

      {configured ? (
        <>
          <p className="mt-2 text-xs font-semibold text-wa-text">
            Monto mínimo de carga: {minimumDepositLabel}
          </p>

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
      <span className="min-w-0 break-words text-right text-xs font-bold text-wa-text">
        {value}
      </span>
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
/* Tarjeta interactiva de RETIRAR                                      */
/* ------------------------------------------------------------------ */
function WithdrawCard({
  minimumAmount,
  minimumLabel,
  balance,
  onSubmit,
}: {
  minimumAmount: number
  minimumLabel: string
  balance: WithdrawBalance
  onSubmit: (text: string) => Promise<WithdrawDelivery>
}) {
  const [amount, setAmount] = useState('')
  const [cbu, setCbu] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [cbuError, setCbuError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<WithdrawDelivery | null>(null)
  const amountFieldId = useId()
  const cbuFieldId = useId()

  const validateAmount = (raw: string): { value: number | null; error: string | null } => {
    const trimmed = raw.trim()
    if (!trimmed) return { value: null, error: 'Ingresá el monto a retirar.' }
    if (trimmed.includes('-')) {
      return { value: null, error: 'El monto no puede ser negativo.' }
    }
    // Permite separadores de miles con puntos o espacios.
    const digits = trimmed.replace(/[\s.]/g, '')
    if (!/^\d+$/.test(digits)) {
      return { value: null, error: 'Ingresá solo números, por ejemplo 200.000.' }
    }
    const value = Number(digits)
    if (!Number.isFinite(value) || value <= 0) {
      return { value: null, error: 'Ingresá un monto mayor a cero.' }
    }
    if (value < minimumAmount) {
      return { value: null, error: `El retiro mínimo es ${minimumLabel}.` }
    }
    return { value, error: null }
  }

  const validateCbu = (raw: string): { value: string | null; error: string | null } => {
    const normalized = raw.replace(/[\s-]/g, '')
    if (!normalized) return { value: null, error: 'Ingresá tu CBU/CVU.' }
    if (!/^\d+$/.test(normalized)) {
      return { value: null, error: 'El CBU/CVU solo puede contener números.' }
    }
    if (normalized.length !== 22) {
      return { value: null, error: 'El CBU/CVU debe tener 22 dígitos.' }
    }
    return { value: normalized, error: null }
  }

  const handleSubmit = async () => {
    if (submitting) return
    const amountResult = validateAmount(amount)
    const cbuResult = validateCbu(cbu)
    setAmountError(amountResult.error)
    setCbuError(cbuResult.error)
    if (amountResult.error || cbuResult.error || amountResult.value === null) return
    if (!cbuResult.value) return

    // Validación contra el saldo real cuando está disponible.
    if (
      (balance.status === 'available' || balance.status === 'stale') &&
      amountResult.value > balance.amount
    ) {
      setAmountError(`El monto supera tu saldo disponible (${balance.formatted}).`)
      return
    }

    setSubmitting(true)
    const formattedAmount = new Intl.NumberFormat('es-AR').format(amountResult.value)
    const requestedAt = new Date().toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    const text = [
      'Solicitud de retiro',
      `Importe: $${formattedAmount}`,
      `CBU/CVU: ${cbuResult.value}`,
      `Fecha y hora: ${requestedAt}`,
    ].join('\n')

    const delivery = await onSubmit(text)
    setSubmitting(false)
    setResult(delivery)
    if (delivery === 'failed') {
      setAmountError('No se pudo enviar el pedido. Revisá tu conexión e intentá otra vez.')
    }
  }

  if (result && result !== 'failed') {
    return (
      <article className="w-full rounded-b-2xl rounded-tl-md rounded-tr-2xl bg-white p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <CheckCircleIcon
            width={18}
            height={18}
            className="mt-0.5 shrink-0 text-success"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-wa-text">Solicitud enviada ✓</p>
            <p className="mt-1 text-[11px] leading-relaxed text-wa-secondary">
              {result === 'sent'
                ? 'El pedido de retiro quedó registrado en el chat. La aprobación depende de la validación del operador.'
                : 'El pedido quedó guardado en este dispositivo. Todavía no fue enviado al servidor.'}
            </p>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="w-full rounded-b-2xl rounded-tl-md rounded-tr-2xl bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold leading-snug text-wa-text">
        Completá el monto a retirar y tu CBU 👇
      </p>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-[#B7EBC9] bg-[#E7F8EE] px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#0F5132]">
          SALDO ACTUAL
        </span>
        <span className="text-right">
          <span className="font-display text-sm font-extrabold text-[#0F5132]">
            {balance.status === 'loading'
              ? 'Actualizando saldo...'
              : balance.status === 'unavailable'
                ? 'No disponible'
                : balance.formatted}
          </span>
          {balance.status === 'stale' && (
            <span className="block text-[9px] font-semibold text-[#8A5A00]">
              · Desactualizado
            </span>
          )}
        </span>
      </div>

      <div className="mt-2.5">
        <label
          htmlFor={amountFieldId}
          className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-wa-secondary"
        >
          RETIRAR
        </label>
        <input
          id={amountFieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setAmountError(null)
            setResult(null)
          }}
          placeholder="Monto a retirar (ej: 200.000)"
          aria-invalid={Boolean(amountError)}
          className={`h-[46px] w-full rounded-[10px] border bg-white px-3 text-sm text-wa-text outline-none transition placeholder:text-wa-secondary ${
            amountError ? 'border-danger' : 'border-wa-divider focus:border-wa-action'
          }`}
        />
        <p className="mt-1 text-[11px] text-wa-secondary">Retiro mínimo: {minimumLabel}</p>
        {amountError && (
          <p className="mt-1 text-[11px] font-medium text-danger" role="alert">
            {amountError}
          </p>
        )}
      </div>

      <div className="mt-2.5">
        <label
          htmlFor={cbuFieldId}
          className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-wa-secondary"
        >
          CBU
        </label>
        <input
          id={cbuFieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={cbu}
          onChange={(event) => {
            setCbu(event.target.value)
            setCbuError(null)
            setResult(null)
          }}
          placeholder="Ingresá tu CBU/CVU"
          aria-invalid={Boolean(cbuError)}
          className={`h-[46px] w-full rounded-[10px] border bg-white px-3 text-sm text-wa-text outline-none transition placeholder:text-wa-secondary ${
            cbuError ? 'border-danger' : 'border-wa-divider focus:border-wa-action'
          }`}
        />
        {cbuError && (
          <p className="mt-1 text-[11px] font-medium text-danger" role="alert">
            {cbuError}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-success-bright px-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        ) : null}
        Enviar pedido de retiro
      </button>

      <p className="mt-2 text-[10px] leading-snug text-wa-secondary">
        El pedido queda como solicitud. No implica aprobación ni acreditación inmediata.
      </p>
    </article>
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
        {message.imagePreviewUrl && (
          <img
            src={message.imagePreviewUrl}
            alt={message.attachmentName ?? 'Comprobante adjunto'}
            className="mb-1.5 max-h-56 w-full rounded-[10px] object-cover"
          />
        )}
        {message.attachmentName && (
          <p className="mb-0.5 text-[11px] font-bold text-wa-action">
            {message.imagePreviewUrl ? 'Comprobante' : 'Archivo'}: {message.attachmentName}
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
