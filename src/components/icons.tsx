import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const LockIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m5 12.8 4.2 4.2L19 6.8" />
  </svg>
)

export const CopyIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8v.7" />
  </svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const PersonIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </svg>
)

export const KeyIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="8" cy="8" r="4" />
    <path d="m11 11 8 8M16.5 16.5 19 19M14 14l2 2" />
  </svg>
)

export const BellIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5Z" />
    <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
  </svg>
)

export const BellOffIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 9.5a6 6 0 0 1 9.2-5.1M18 10.5c0 4 1.5 4.5 1.5 4.5h-11" />
    <path d="M10 18.5a2.2 2.2 0 0 0 4 0M4 3l16 18" />
  </svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3.2 20 6v5.6c0 4.6-3.2 7.6-8 9.2-4.8-1.6-8-4.6-8-9.2V6l8-2.8Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </svg>
)

export const MinusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
)

export const LogoutIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 4h4.2A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8H14" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const RefreshIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 11a8 8 0 1 0-2.3 6.4" />
    <path d="M20 4.5V11h-6.2" />
  </svg>
)

export const ExternalIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M19 14.5v3.7A1.8 1.8 0 0 1 17.2 20H5.8A1.8 1.8 0 0 1 4 18.2V6.8A1.8 1.8 0 0 1 5.8 5h3.7" />
  </svg>
)

export const SendIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" />
  </svg>
)

export const AttachIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 11.5 12 19.5a4.6 4.6 0 0 1-6.5-6.5l7.7-7.7a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a1.6 1.6 0 0 1-2.2-2.2l7-7" />
  </svg>
)

export const ImageIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m4.5 17 4.6-4.3 3.4 3 2.5-2.2 4.5 4" />
  </svg>
)

export const FileIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13.5 3.5H7A1.9 1.9 0 0 0 5 5.4v13.2a1.9 1.9 0 0 0 1.9 1.9h10.2a1.9 1.9 0 0 0 1.9-1.9V9l-5.5-5.5Z" />
    <path d="M13.5 3.5V9H19M8.5 13h7M8.5 16.5h5" />
  </svg>
)

export const UploadIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15.5v3A1.8 1.8 0 0 0 5.8 20.3h12.4a1.8 1.8 0 0 0 1.8-1.8v-3" />
  </svg>
)

export const CheckCircleIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.6 2.6 5.4-5.6" />
  </svg>
)

export const AlertIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.2M12 16.4h.01" />
  </svg>
)

export const PlayIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 5.2 19 12 8 18.8V5.2Z" />
  </svg>
)

export const SettingsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </svg>
)

export const DownloadIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 17.5v1.7A1.8 1.8 0 0 0 6.3 21h11.4a1.8 1.8 0 0 0 1.8-1.8v-1.7" />
  </svg>
)

export const ShareIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 15V3.5M8.5 7 12 3.5 15.5 7" />
    <path d="M6 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 11H18" />
  </svg>
)

export const DotsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="5.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const ChatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20.5 11.4a8.1 8.1 0 0 1-8.4 8.1 9 9 0 0 1-3-.6L4 20.5l1.5-4.7a8 8 0 0 1-.9-3.7 8.1 8.1 0 0 1 8.4-8.1 8.1 8.1 0 0 1 7.5 7.4Z" />
  </svg>
)

/** Glifo relleno estilo WhatsApp, para el widget flotante. */
export const WhatsAppBubbleIcon = (props: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    aria-hidden
    {...props}
  >
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.41Z" />
  </svg>
)
