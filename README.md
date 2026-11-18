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
| `VITE_PUBLIC_BANK_CBU` | CBU público para transferencias | vacío |
| `VITE_PUBLIC_BANK_ALIAS` | Alias público | vacío |
| `VITE_PUBLIC_BANK_HOLDER` | Titular de la cuenta | vacío |
| `VITE_MIN_DEPOSIT_LABEL` | Monto mínimo informativo | vacío |
| `VITE_JURISDICTION_NOTICE` | Aviso legal +18 | aviso estándar |

`appConfig` expone además:

```ts
brandName: 'Ganamos'
domain: 'ganamos.net'
platformUrl: 'https://ganamos.net'
apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
bankDetails: { cbu, alias, accountHolder, minimumDepositLabel }
```

Si los datos bancarios quedan vacíos, el chat muestra el estado pendiente y
**no inventa datos**. Para previsualizar la tarjeta de transferencia en
desarrollo, `.env.example` incluye valores demo claramente identificados.

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
   - La clave temporal vive **solo en memoria**; nunca se persiste.
3. **Plataforma** (`src/screens/PlatformScreen.tsx`)
   - `<iframe src="https://ganamos.net" />` a pantalla completa (`w-screen h-dvh`).
   - Píldora flotante superior con usuario y menú de credenciales copiables,
     notificaciones, juego responsable, minimizar y cerrar sesión.
   - Fallback honesto con reintento y apertura externa si el sitio no carga.
   - Chat abierto automáticamente al entrar.
4. **Chat estilo WhatsApp** (`src/components/SupportChat.tsx`)
   - Header verde, estado real (`en línea`, `conectando…`, `sin conexión`,
     `modo demostración`, `configuración pendiente`).
   - Tarjeta de CBU/Alias/Titular con “Copiar CBU” y “Copiar ALIAS”.
   - “SUBIR COMPROBANTE” con preview, validación de formato (JPG/PNG/WebP/PDF)
     y límite de 10 MB.
   - Acciones rápidas `CARGAR` / `RETIRAR` / `SOPORTE`.
   - Botón `📲 Instalar app`.
5. **PWA**
   - Instalación con `beforeinstallprompt` y guía manual para iOS/Safari.
   - Notificaciones con estados `default`, `granted`, `denied`, `unsupported`
     y solicitud únicamente tras acción explícita.
   - `public/manifest.json`: `name`/`short_name` “Ganamos”, `display: standalone`,
     `background_color`/`theme_color` `#0D061A` e íconos 192/512/maskable.

## Contratos API esperados

1. `GET /api/health` → `{ "ok": true, "chat_enabled": true }`
2. `POST /api/register-player` → `{ "clientId", "name", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid" }`
   → `{ "success": true, "user": { "id", "username", "temporaryPassword" } }`
3. `POST /api/chat/messages` → `{ "clientId", "playerId", "text", "topic" }`
4. `POST /api/chat/receipts` (multipart `clientId`, `playerId`, `file`)

## Assets

- `public/img_ganamos_emblem.jpg` — isotipo oficial.
- `public/img_ganamos_launcher.jpg` — emblema/wordmark de launcher.
- `public/icons/` — iconos PWA 192, 512, maskable y apple-touch-icon.
- `public/assets/aistudio/` — capturas y documento de referencia del diseño
  (no se precachean en el service worker).

## Privacidad y estados reales

- No se muestran datos bancarios ficticios ni estados “en línea” sin verificación.
- No se confirma la recepción de un comprobante sin respuesta del servidor: si
  no hay backend, se informa que quedó guardado en el dispositivo.
- “Cerrar sesión” limpia cuenta, onboarding y preferencias locales.
