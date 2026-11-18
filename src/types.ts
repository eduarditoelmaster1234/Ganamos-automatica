export type Destination = 'register' | 'account-created' | 'platform'

export interface AttributionParams {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  fbclid?: string
}

export interface PlayerAccount {
  id: string
  username: string
  isDemo: boolean
  createdAtIso?: string
  source: 'server' | 'local'
}

/** Vivien solo en sessionStorage mientras se muestra la confirmación. */
export interface EphemeralCredentials {
  username: string
  temporaryPassword: string | null
}

export type LegalDocumentType = 'privacy' | 'terms' | 'cookies' | 'responsible'

export type NotificationPermissionStatus =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported'

export type ChatConnectionStatus = 'online' | 'connecting' | 'offline' | 'pending' | 'demo'

export type MessageSender = 'user' | 'support' | 'system'

export type MessageDeliveryStatus = 'sending' | 'sent' | 'failed' | 'local'

export interface ChatMessage {
  id: string
  sender: MessageSender
  text: string
  timestampLabel: string
  deliveryStatus: MessageDeliveryStatus
  attachmentName?: string
}

export interface ReceiptAttachment {
  file: File
  displayName: string
  mimeType: string
  sizeBytes: number
  previewUrl?: string
}

export type ReceiptUploadState =
  | { kind: 'none' }
  | { kind: 'selected'; attachment: ReceiptAttachment }
  | { kind: 'uploading'; attachment: ReceiptAttachment }
  | { kind: 'sent'; attachment: ReceiptAttachment; locally: boolean }
  | { kind: 'error'; attachment: ReceiptAttachment; message: string }

export interface RegistrationResult {
  account: PlayerAccount
  credentials: EphemeralCredentials
  source: 'server' | 'local'
}
