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
```

Los datos bancarios salen siempre de `appConfig.bankDetails`: el chat no
contiene valores hardcodeados. Si se dejan vacíos, el chat muestra el estado
pendiente y **no inventa datos**. Los defaults actuales corresponden a los
datos públicos de transferencia del operador mostrados en las capturas de
referencia y pueden sobreescribirse por entorno sin tocar el código.

La contraseña del jugador la emite el backend (`PLAYER_PASSWORD`, default
`12345a`). El frontend **nunca** inventa credenciales: si el backend no
responde, el registro muestra un error claro y permite reintentar. Las
credenciales del agente del panel viven solo en `server/.env`.

## Flujo implementado

1. **Registro** (`src/screens/RegistrationScreen.tsx`)
   - Campo único de nombre/apodo con la misma validación que `NameValidator`:
     3–24 caracteres, letras/números/espacios/guiones, colapso de espacios.
   - Captura de `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`,
     `utm_content` y `fbclid` (first-touch, persistida en `localStorage`).
   - `POST ${apiUrl}/api/register-player`. El backend crea la cuenta real en el
     panel de agentes y devuelve un token de acceso individual. Si el backend
     no responde, se muestra un error y se permite reintentar (sin cuenta ficticia).
   - Persistencia de la cuenta, el `clientId` y el token del jugador en
     `localStorage`.
2. **Cuenta creada** (`src/screens/AccountCreatedScreen.tsx`)
   - Check verde, `USUARIO` y `CLAVE` copiables en un toque con feedback
     “¡Copiado! ✓”, botón verde “Continuar a mi cuenta”.
   - La clave mostrada es la que emitió el backend (`12345a`).
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
   - Tarjeta interactiva de RETIRAR con `SALDO ACTUAL` dinámico (saldo real del
     panel, actualizado al abrir el chat, al tocar RETIRAR, cada 3 s con la
     tarjeta visible y cada 15 s con el chat abierto), validación de monto
     (obligatorio, numérico, sin negativos, mínimo `$10.000`, sin superar el
     saldo disponible) y CBU/CVU de 22 dígitos (acepta espacios/guiones y los
     normaliza). El pedido incluye importe, CBU y fecha/hora, y se aclara que
     es una solicitud.
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

1. `GET /api/health` → `{ "ok": true, "chat_enabled": true, "agent_configured": true, "database": "ok", "time": "..." }`
2. `POST /api/register-player` → `{ "clientId", "name", "utm_source", ... }`
   → `{ "success": true, "user": { "id", "username", "temporaryPassword" }, "token": "<player token>" }`
3. `GET /api/player-balance` (header `Authorization: Bearer <token>`)
   → `{ "success": true, "username", "balance", "currency", "updatedAt", "stale" }`
4. `POST /api/chat/messages` (con token) → `{ "clientId", "playerId", "text", "topic" }`
5. `POST /api/chat/receipts` (multipart `clientId`, `playerId`, `file`, con token)

## Backend (`server/`)

Implementación Fastify + SQLite (`node:sqlite`) que registra jugadores reales en
el panel de agentes y consulta el saldo. Ver `server/README.md` para la
configuración, los endpoints, las pruebas y las limitaciones externas.

- Instalar: `cd server && npm install`
- Copiar `server/.env.example` a `server/.env` y completar `AGENT_USER` / `AGENT_PASS`.
- Iniciar: `cd server && npm start` (health en `http://localhost:3000/api/health`).
- Tests: `cd server && npm test` (26 casos con panel mock basado en el contrato real).

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
