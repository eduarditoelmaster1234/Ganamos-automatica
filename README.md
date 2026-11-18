# Ganamos — PWA (React + Vite + Tailwind)

Progressive Web App de **Ganamos** (`ganamos.net`), migrada desde la app Android
nativa en Kotlin + Jetpack Compose. Conserva la identidad visual, los textos en
español argentino, la validación y el flujo completo de registro, confirmación,
plataforma embebida y chat de soporte estilo WhatsApp.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS** con los tokens de color, tipografía y formas de `design.md`
- **vite-plugin-pwa** con `registerType: 'autoUpdate'`, service worker y caché offline
- **@fontsource** para Plus Jakarta Sans e Inter (self-hosted, sin CDN)

## Comandos

```bash
npm install       # instalar dependencias
npm run dev       # entorno de desarrollo (http://localhost:5173)
npm run build     # typecheck + build de producción en dist/
npm run preview   # servir el build (http://localhost:4173)
```

## Configuración del cliente

Toda la configuración editable vive en `src/config/appConfig.ts` y en variables
de entorno públicas (ver `.env.example`):

| Variable | Descripción | Default |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:3000` |
| `VITE_PUBLIC_BANK_CBU` | CBU público para transferencias | `0000151500035454008162` |
| `VITE_PUBLIC_BANK_ALIAS` | Alias público | `ANSIA.BUENO.BALCON` |
| `VITE_PUBLIC_BANK_HOLDER` | Titular de la cuenta | `ESHTECH SRL` |
| `VITE_MIN_DEPOSIT_LABEL` | Monto mínimo informativo | `$3.000` |
| `VITE_JURISDICTION_NOTICE` | Aviso legal +18 | aviso estándar |

`appConfig` expone además:

```ts
brandName: 'Ganamos'
domain: 'ganamos.net'
platformUrl: 'https://ganamos.net'
apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
bankDetails: { cbu, alias, accountHolder, minimumDepositLabel }
withdrawals: { minimumAmount: 10000, minimumLabel: '$10.000' }
localFallbackPassword: '12345a'
```

Los datos bancarios salen siempre de `appConfig.bankDetails`: el chat no
contiene valores hardcodeados. Si se dejan vacíos, el chat muestra el estado
pendiente y **no inventa datos**. Los defaults actuales corresponden a los
datos públicos de transferencia del operador mostrados en las capturas de
referencia y pueden sobreescribirse por entorno sin tocar el código.

La clave del flujo local/fallback es fija (`12345a`) por pedido del operador.
Cuando el backend responde, la app **no reemplaza** la contraseña emitida por
el servidor: si en producción se exige una clave individual, hay que adaptar
esa política en el backend antes de usar la clave fija.

## Flujo implementado

1. **Registro** (`src/screens/RegistrationScreen.tsx`)
   - Campo único de nombre/apodo con la misma validación que `NameValidator`:
     3–24 caracteres, letras/números/espacios/guiones, colapso de espacios.
   - Captura de `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`,
     `utm_content` y `fbclid` (first-touch, persistida en `localStorage`).
   - `POST ${apiUrl}/api/register-player`. Si la API no responde, genera una
     cuenta local de resguardo (sin simular confirmación del servidor).
   - Persistencia de la cuenta y del `clientId` en `localStorage`.
2. **Cuenta creada** (`src/screens/AccountCreatedScreen.tsx`)
   - Check verde, `USUARIO` y `CLAVE` copiables en un toque con feedback
     “¡Copiado! ✓”, botón verde “Continuar a mi cuenta”.
   - En modo local/fallback la clave mostrada es exactamente `12345a`.
   - La clave temporal vive **solo en memoria**; nunca se persiste.
3. **Plataforma** (`src/screens/PlatformScreen.tsx`)
   - `<iframe src="https://ganamos.net" />` a pantalla completa dentro de un
     contenedor `relative isolate` (evita que el iframe tape chat y widget).
   - Píldora flotante superior con usuario y menú de credenciales copiables,
     notificaciones, juego responsable, minimizar y cerrar sesión.
   - Fallback honesto con reintento y apertura externa si el sitio no carga.
   - Chat montado siempre: minimizarlo conserva mensajes, formularios y scroll.
   - Widget flotante inferior derecho con píldora `↓ CARGAS / RETIROS ↓`,
     botón circular verde, pulso y badge rojo `1`.
4. **Chat estilo WhatsApp** (`src/components/SupportChat.tsx`)
   - Header verde `#075E54` con avatar circular del perrito VIP
     (`public/dog-avatar.jpg`), título “Chat” y estado real (`en línea`,
     `conectando…`, `sin conexión`, `modo demostración`, `configuración pendiente`).
   - Tarjeta de CARGAR insertada una sola vez con CBU/Alias/Titular, monto
     mínimo, “Copiar CBU”/“Copiar ALIAS” con `¡Copiado! ✓` y
     “SUBIR COMPROBANTE” (preview + imagen en el hilo; JPG/PNG/WebP/PDF,
     límite 10 MB). Sin backend se informa recepción local, nunca bancaria.
   - Tarjeta interactiva de RETIRAR con `SALDO ACTUAL $0`, validación de monto
     (obligatorio, numérico, sin negativos, mínimo `$10.000`) y CBU/CVU de
     22 dígitos (acepta espacios/guiones y los normaliza). El pedido incluye
     importe, CBU y fecha/hora, y se aclara que es una solicitud.
   - Acciones rápidas `CARGAR` / `RETIRAR` / `SOPORTE`.
   - Botón `📲 Instalar app`.
5. **PWA**
   - Captura global de `beforeinstallprompt` con `preventDefault()` y
     `appinstalled`; el botón ejecuta `prompt()` directamente cuando el evento
     está disponible y no intercala pantallas.
   - Guía manual paso a paso para iOS/Safari (Compartir → Agregar a pantalla
     de inicio) y navegadores sin prompt.
   - Detección de `display-mode: standalone` y `navigator.standalone` para
     ocultar el botón cuando ya está instalada.
   - Notificaciones con estados `default`, `granted`, `denied`, `unsupported`
     y solicitud únicamente tras acción explícita.
   - `public/manifest.json`: `name`/`short_name` “Ganamos”, `id`/`start_url`
     `/`, `display: standalone`, `background_color`/`theme_color` `#0D061A`
     e íconos 192/512/maskable.

## Contratos API esperados

1. `GET /api/health` → `{ "ok": true, "chat_enabled": true }`
2. `POST /api/register-player` → `{ "clientId", "name", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid" }`
   → `{ "success": true, "user": { "id", "username", "temporaryPassword" } }`
3. `POST /api/chat/messages` → `{ "clientId", "playerId", "text", "topic" }`
4. `POST /api/chat/receipts` (multipart `clientId`, `playerId`, `file`)

## Assets

- `public/img_ganamos_emblem.jpg` — isotipo oficial.
- `public/img_ganamos_launcher.jpg` — emblema/wordmark de launcher.
- `public/dog-avatar.jpg` — avatar circular del chat (perrito VIP).
- `public/icons/` — iconos PWA 192, 512, maskable y apple-touch-icon.
- `public/assets/aistudio/` — capturas y documento de referencia del diseño
  (no se precachean en el service worker).

## Privacidad y estados reales

- No se muestran datos bancarios ficticios ni estados “en línea” sin verificación.
- No se confirma la recepción de un comprobante sin respuesta del servidor: si
  no hay backend, se informa que quedó guardado en el dispositivo.
- “Cerrar sesión” limpia cuenta, onboarding y preferencias locales.
