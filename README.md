# Ganamos — Aplicación Android

Aplicación Android nativa (Kotlin + Jetpack Compose + Material 3) para **Ganamos** (`ganamos.net`), diseñada con enfoque mobile-first, accesibilidad WCAG/Material, gestión honesta de estados asíncronos y cumplimiento con políticas de Google Play.

## Estructura del proyecto

- `app/src/main/java/com/example/config/AppConfig.kt`: Configuración pública centralizada leída desde `BuildConfig`.
- `app/src/main/java/com/example/domain/model/`: Modelos de dominio, estados sellados (`AsyncState`, `RegistrationOutcome`, `ReceiptUploadState`) y validación (`NameValidator`).
- `app/src/main/java/com/example/data/preferences/SessionPreferencesStore.kt`: Persistencia local no sensible con Jetpack DataStore (`clientId`, usuario, preferencias de UI; nunca contraseñas ni comprobantes).
- `app/src/main/java/com/example/data/remote/`: Contratos Retrofit + Moshi + OkHttp y monitor de conectividad (`AndroidNetworkMonitor`).
- `app/src/main/java/com/example/data/repository/GanamosRepository.kt`: Repositorio desacoplado que exige confirmación real del backend y expone estados explícitos `NotConfigured`, `Offline` y `Error`.
- `app/src/main/java/com/example/ui/`: ViewModel (`GanamosViewModel`), navegación (`GanamosApp`), tema (`ui/theme/`), componentes (`ui/components/`) y pantallas (`ui/screens/`).

## Configuración pública del operador

Las siguientes propiedades pueden configurarse al compilar mediante propiedades Gradle (`-PGANAMOS_...`) o variables de entorno (ver `.env.example`):

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `GANAMOS_PLATFORM_URL` | URL oficial de la plataforma | `https://ganamos.net` |
| `GANAMOS_API_URL` | URL base HTTPS del backend (`https://...`) | `""` (pendiente) |
| `GANAMOS_CHAT_ENABLED` | Habilita indicador de chat en salud inicial | `false` |
| `GANAMOS_EMBED_ALLOWED` | Habilita el `WebView` integrado de la plataforma (con fallback manual si falla la carga) | `true` |
| `GANAMOS_PUBLIC_BANK_CBU` | CBU público informado para transferencias | `""` (oculto) |
| `GANAMOS_PUBLIC_BANK_ALIAS` | Alias público informado | `""` (oculto) |
| `GANAMOS_PUBLIC_BANK_HOLDER` | Titular de la cuenta receptora | `""` (oculto) |
| `GANAMOS_MIN_DEPOSIT_LABEL` | Etiqueta informativa de monto mínimo | `""` |
| `GANAMOS_JURISDICTION_NOTICE` | Aviso legal de edad (+18) y jurisdicción | Aviso estándar +18 |

## Contratos API esperados en `GANAMOS_API_URL`

1. `GET /api/health` → `{ "ok": true, "chat_enabled": true }`
2. `POST /api/register-player` → `{ "clientId", "name", "utm_source", "utm_campaign", "fbclid" }` → `{ "success": true, "user": { "id", "username", "temporaryPassword" } }`
3. `GET /api/payment-instructions` → `{ "configured": true, "cbu", "alias", "accountHolder", "minimumDepositLabel" }`
4. `GET /api/chat/history?clientId=...&playerId=...` → `{ "messages": [...] }`
5. `POST /api/chat/messages` → `{ "clientId", "playerId", "text", "topic" }`
6. `POST /api/chat/receipts` (multipart `clientId`, `playerId`, `file`) → `{ "success": true, "receiptId": "..." }`

## Comandos de compilación y pruebas

```bash
gradle :app:assembleDebug
gradle :app:testDebugUnitTest
```
