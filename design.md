# design.md — Sistema de diseño de Ganamos (Android)

**Producto:** Ganamos  
**Dominio:** `ganamos.net`  
**Plataforma:** Android nativo (Kotlin + Jetpack Compose + Material 3)  
**Enfoque:** Mobile-first y responsive adaptativo

---

## 1. Dirección visual e identidad original

Ganamos adopta una estética nocturna tecnológica en violetas profundos (`#0D061A`), superficies elevadas oscuras (`#160C2B`, `#1B1030`), acentos violeta eléctrico (`#8B5CF6`, `#7C3AED`) y verde esmeralda (`#16A34A`, `#22C55E`) reservado exclusivamente para confirmaciones reales del servidor y acciones positivas verificadas.

La marca cuenta con recursos gráficos originales (`img_ganamos_emblem` e `img_ganamos_launcher`) de un guardián felino geométrico con visor violeta/dorado y un wordmark propio (`GanamosWordmark`), sin copiar mascotas, banners ni marcas de terceros.

---

## 2. Tokens implementados (`ui/theme/`)

### 2.1 Color (`Color.kt` & `Theme.kt`)

| Token | Hex / Valor | Uso |
|---|---|---|
| `BgVoid` | `#0D061A` | Fondo principal |
| `BgElevated` | `#160C2B` | Cards principales, headers y bottom sheets |
| `SurfaceCard` | `#1B1030` | Contenedores secundarios y burbujas |
| `SurfaceStrong` | `#24143D` | Superficies activas e iconos |
| `BorderSubtle` | `rgba(168, 85, 247, 0.25)` | Bordes de cards e inputs |
| `PrimaryViolet` | `#8B5CF6` | Acción primaria |
| `PrimaryStrong` | `#7C3AED` | Gradientes de CTA |
| `PrimarySoft` | `#C084FC` | Acentos, foco y enlaces |
| `SuccessEmerald` | `#16A34A` | Confirmación verificada y burbuja de chat |
| `SuccessBright` | `#22C55E` | Indicadores confirmados |
| `TextPrimary` | `#F8F5FF` | Texto principal |
| `TextMuted` | `#B8A9CC` | Texto secundario |
| `TextSubtle` | `#9383AA` | Texto auxiliar |
| `DangerRed` | `#EF4444` | Errores de validación / desconexión |
| `WarningAmber` | `#F59E0B` | Configuración pendiente / modo demo |
| `WaHeaderGreen` | `#075E54` | Header del chat estilo WhatsApp |
| `WaAvatarTeal` | `#128C7E` | Avatar circular "G" del chat |
| `WaConversationCream` | `#EFEAE2` | Fondo crema del área de conversación |
| `WaSystemBannerBg` | `#D9EDF7` | Banner informativo de conexión |
| `WaBubbleIncoming` | `#FFFFFF` | Burbuja blanca / card de transferencia |
| `WaBubbleOutgoing` | `#D9FDD3` | Burbujas salientes del usuario |
| `WaActionGreen` | `#16A34A` | CTAs positivos y botón `CARGAR` |
| `WaComposerBg` | `#F0F2F5` | Barra inferior del composer |

### 2.2 Tipografía (`Type.kt`)

Fuentes empaquetadas localmente en `app/src/main/res/font/`:
- **Display y títulos / UI:** `Plus Jakarta Sans` (`R.font.plus_jakarta_sans`)
- **Cuerpo secundario y etiquetas técnicas:** `Inter` (`R.font.inter`)

### 2.3 Formas (`Shapes.kt`)

- Cards principales: `22–26.dp`
- Paneles secundarios: `16–18.dp`
- Botones y campos de texto: `14–16.dp`
- Chips y pills de estado: `999.dp`

---

## 3. Pantallas y estados

1. **Registro (`RegistrationScreen`)**: Diseño minimalista enfocado exclusivamente en crear la cuenta: card centrada (`widthIn(max = 460.dp)`), logo original de Ganamos, `"Creá tu cuenta gratis"`, `"Estamos Online 24hs!"`, campo único de nombre/apodo, CTA violeta `"CREAR MI CUENTA · +18"`, microtexto `"registro seguro · sin tarjeta · gratis"` y pie legal discreto. Sin barras superiores ni tarjetas accesorias innecesarias; ante falta de backend muestra el aviso compacto de configuración pendiente con acceso al modo demostración.
2. **Confirmación (`AccountCreatedScreen`)**: Check verde circular, título `"¡Cuenta creada!"`, tarjetas de `USUARIO` y `CLAVE` (solo si el backend entrega clave temporal en memoria, nunca persistida en `DataStore`) con copiado instantáneo (`"¡Copiado! ✓"`), botón verde `"Continuar a mi cuenta"` y texto auxiliar de guardado.
3. **Plataforma (`PlatformScreen`)**: `WebView` integrado a pantalla completa cargando `https://ganamos.net` sin barra superior fija (preservando cookies, historial interno y navegación con `BackHandler`). En esquina superior izquierda incluye la píldora flotante translúcida `@usuario` (expandible con `Copiar usuario`, `Copiar clave`, `Notificaciones`, `Juego Responsable`, `Minimizar píldora`, `Cerrar sesión` y `Cerrar menú`, y minimizable a badge circular). Si la página bloquea o falla la carga, muestra un fallback elegante in-app para reintentar o abrir el navegador externo manualmente.
4. **Chat estilo WhatsApp (`SupportChatOverlay`)**: Se abre automáticamente tras `"Continuar a mi cuenta"` y recuerda si el usuario lo minimizó (`chatMinimized` en `DataStore`) para mostrar la burbuja circular verde flotante abajo a la derecha sin duplicar mensajes iniciales. En móvil se adapta como overlay con `imePadding()` + `navigationBarsPadding()`, y en tablets/pantallas amplias (`>= 720.dp`) como ventana flotante inferior derecha (`368.dp`). Header verde `#075E54` con avatar `"G"`, título `"Chat"`, estado honesto (`en línea`, `modo demostración`, `sin conexión` o `pendiente`) y botón `X` para minimizar; fondo crema `#EFEAE2` con patrón geométrico sutil; banner celeste `#D9EDF7`; tarjeta blanca de transferencia leyendo `AppConfig.bankDetails` / API sin datos inventados, botones `"Copiar CBU"` y `"Copiar ALIAS"`, botón `"SUBIR COMPROBANTE"` vía **Android Photo Picker / SAF** (con previsualización y confirmación explícita), acciones rápidas (`CARGAR`, `RETIRAR`, `SOPORTE`) y composer `#F0F2F5`. Al ejecutarse como APK nativa standalone en Android, omite el botón web `"Instalar app"`.
5. **Notificaciones (`NotificationsSheet`)**: Solicita `POST_NOTIFICATIONS` únicamente tras interacción explícita y distingue `Default`, `Granted`, `Denied` (con enlace a Ajustes de Android) y `Unsupported`.

---

## 4. Reglas de integridad y accesibilidad

- Edge-to-edge habilitado (`enableEdgeToEdge()`) con `WindowInsets.safeDrawing`.
- Targets táctiles mínimos de `48.dp` (`minimumInteractiveComponentSize()`).
- Estados acompañados de icono y texto, además de `LiveRegionMode.Polite` para feedback dinámico.
- Ningún secreto, contraseña ni dato bancario ficticio hardcodeado en cliente o almacenamiento local.
