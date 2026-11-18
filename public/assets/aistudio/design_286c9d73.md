# design.md --- Sistema de diseño de Ganamos

**Producto:** Ganamos\
**Dominio:** `ganamos.net`\
**Tipo:** Progressive Web App (PWA)\
**Enfoque:** Mobile-first\
**Estado del documento:** Especificación de diseño inicial; adaptar a la
arquitectura y assets reales del repositorio.

------------------------------------------------------------------------

## 1. Dirección de diseño

Ganamos debe sentirse como un producto digital moderno, nocturno y
tecnológico. La identidad se apoya en violetas profundos, superficies
oscuras y acentos luminosos cuidadosamente dosificados. El verde se
reserva para acciones positivas y estados confirmados.

Las imágenes de referencia sirven para comprender el recorrido del
usuario y la atmósfera general. No deben copiarse su composición,
mascota, banners, textos, iconos ni identidad visual. La marca debe
contar con un isotipo y recursos gráficos originales.

### Atributos de marca

-   Moderna y energética.
-   Clara y confiable.
-   Cercana, con español argentino natural.
-   Visualmente intensa, pero sin ruido ni saturación excesiva.
-   Accesible y usable con una sola mano.

### Principios

1.  Claridad sobre decoración.
2.  Consistencia entre todas las pantallas.
3.  Una acción principal claramente identificable.
4.  Feedback visible para cada interacción.
5.  Estados reales: nunca simular operaciones confirmadas.
6.  Diseño responsive y accesible desde el inicio.

------------------------------------------------------------------------

## 2. Fundamentos visuales

### 2.1 Paleta de color

  Token                      Valor                        Uso
  -------------------------- ---------------------------- -----------------------------
  `--color-bg`               `#0D061A`                    Fondo principal
  `--color-bg-elevated`      `#160C2B`                    Fondo de secciones elevadas
  `--color-surface`          `#1B1030`                    Cards y paneles
  `--color-surface-strong`   `#24143D`                    Superficies activas
  `--color-border`           `rgba(168, 85, 247, 0.25)`   Bordes sutiles
  `--color-primary`          `#8B5CF6`                    Acción primaria
  `--color-primary-strong`   `#7C3AED`                    Hover/pressed
  `--color-primary-soft`     `#C084FC`                    Acentos y gradientes
  `--color-success`          `#16A34A`                    Éxito confirmado
  `--color-success-bright`   `#22C55E`                    CTA positivo
  `--color-text`             `#F8F5FF`                    Texto principal
  `--color-text-muted`       `#B8A9CC`                    Texto secundario
  `--color-text-subtle`      `#9383AA`                    Texto auxiliar
  `--color-danger`           `#EF4444`                    Error
  `--color-warning`          `#F59E0B`                    Advertencia

**Reglas de color** - Mantener el fondo predominantemente oscuro. - Usar
gradientes violetas en CTA, marca y detalles puntuales. - No aplicar
glow a todos los controles. - El verde indica una acción positiva o un
estado confirmado; no debe decorar operaciones no verificadas. - Los
errores y advertencias siempre deben incluir texto o icono, no solo
color. - Verificar contraste WCAG AA para texto y controles.

### 2.2 Fondos y efectos

Fondo recomendado: - Base sólida `#0D061A`. - Radiales violetas de baja
opacidad en zonas de foco. - Sin partículas permanentes ni animaciones
pesadas. - Evitar patrones que reduzcan la legibilidad.

Superficies: - `#160C2B` o `#1B1030`. - Borde violeta translúcido. -
Sombra amplia y difusa, de baja opacidad. - Blur solo en overlays o
elementos flotantes cuando aporte jerarquía.

### 2.3 Tipografía

Preferencia: **Plus Jakarta Sans**. Alternativa: **Inter**.

  Estilo      Tamaño orientativo       Peso
  --------- -------------------- ----------
  Display              30--36 px   700--800
  H1                   26--30 px        700
  H2                   20--24 px        700
  H3                   16--18 px   600--700
  Body                 15--16 px   400--500
  Small                13--14 px        400
  Caption              11--12 px        400

-   Altura de línea de body: 1.45--1.6.
-   Evitar textos legales demasiado pequeños.
-   No usar mayúsculas sostenidas en bloques largos.
-   Mantener una jerarquía estable entre pantallas.

### 2.4 Radios, bordes y elevación

-   Card principal: 20--26 px.
-   Panel secundario: 16--20 px.
-   Input y botones: 12--16 px.
-   Chips: 999 px.
-   Borde normal: 1 px.
-   Borde de foco: 2 px, visible y contrastado.
-   Sombra de CTA: violeta suave, nunca excesiva.

------------------------------------------------------------------------

## 3. Layout y responsive

### 3.1 Breakpoints de referencia

Respetar los breakpoints existentes del proyecto. Si no hay sistema
definido:

  Nombre       Ancho
  ------------ ---------------
  Mobile S     320--374 px
  Mobile M/L   375--767 px
  Tablet       768--1023 px
  Desktop      1024 px o más

### 3.2 Reglas mobile-first

-   Diseñar primero para 360--390 px.
-   Padding horizontal de pantalla: 16--20 px.
-   Ancho de lectura limitado; no estirar formularios en escritorio.
-   Controles táctiles de al menos 44×44 px.
-   Respetar `env(safe-area-inset-*)`.
-   Usar `100dvh` con fallback cuando corresponda.
-   Evitar scroll horizontal.
-   En formularios, el CTA debe estar cerca del campo y ser fácil de
    alcanzar.
-   Con teclado virtual abierto, el input de chat debe permanecer
    visible.

### 3.3 Escritorio

-   Contenido principal centrado y con ancho máximo razonable.
-   En pantallas de acceso, conservar una composición compacta.
-   Chat flotante en esquina inferior derecha, con límites de ancho y
    alto.
-   No convertir cada bloque móvil en una tarjeta gigante.
-   La plataforma externa debe ocupar el espacio disponible solo si su
    integración está autorizada y funciona.

------------------------------------------------------------------------

## 4. Identidad de marca y assets

### 4.1 Logo

Crear un logo tipográfico original para "Ganamos" y un isotipo
reconocible en tamaños pequeños.

La dirección creativa puede explorar un guardián felino/fantástico con
rasgos geométricos, gafas y detalles violetas/dorados. Debe ser una
ilustración original, no una copia de la mascota mostrada en las
capturas.

### 4.2 Variantes necesarias

-   Logo horizontal para header.
-   Isotipo para header móvil.
-   Icono cuadrado para PWA.
-   Favicon.
-   Iconos 192×192 y 512×512.
-   Variante `maskable` con zona segura.
-   Versión monocromática para contextos reducidos.

No deformar el logo ni agregar fondos improvisados. Optimizar assets y
usar formatos adecuados.

------------------------------------------------------------------------

## 5. Componentes

### 5.1 Botones

**Primary** - Gradiente violeta. - Texto blanco de alto contraste. -
Alto mínimo 52--56 px en CTA principales. - Glow moderado solo en
acciones principales. - Estados: default, hover, focus-visible, pressed,
loading, disabled.

**Success** - Verde esmeralda. - Reservado para acciones positivas y
confirmaciones reales. - No usarlo para simular que una carga, retiro o
transferencia fue aprobada.

**Secondary** - Fondo transparente o superficie oscura. - Borde
discreto. - Texto claro.

**Tertiary / text** - Sin fondo. - Área táctil suficiente. - Subrayado o
foco visible cuando corresponda.

Todos los botones deben tener `disabled` real durante acciones no
repetibles.

### 5.2 Inputs

-   Alto recomendado: 54--58 px.
-   Fondo oscuro profundo.
-   Borde violeta tenue.
-   Foco visible con borde y halo moderado.
-   Label persistente; el placeholder no reemplaza al label.
-   Error textual debajo del campo.
-   Texto y placeholder con contraste suficiente.

### 5.3 Cards

-   Superficie oscura elevada.
-   Padding 18--24 px según viewport.
-   Borde sutil.
-   Jerarquía clara entre título, descripción y acciones.
-   No anidar demasiadas cards.

### 5.4 Badges y estados

-   Indicador acompañado por texto.
-   Verde: conectado o éxito solo si se verificó.
-   Ámbar: advertencia o estado pendiente.
-   Rojo: error o bloqueo.
-   Gris/violeta: estado neutral.
-   No mostrar "En línea" por defecto sin señal real.

### 5.5 Feedback

-   Toast o texto inline breve.
-   "Copiado" para operaciones de portapapeles.
-   Mensajes de error accionables.
-   No usar `alert()` como patrón principal.
-   Los mensajes deben anunciarse mediante `aria-live` cuando
    corresponda.

------------------------------------------------------------------------

## 6. Especificación de pantallas

### 6.1 Registro

**Objetivo:** iniciar el registro con un flujo simple y transparente.

Estructura: 1. Marca/isotipo. 2. Título "Creá tu cuenta". 3. Subtítulo
informativo. 4. Campo "Nombre o apodo". 5. CTA "Crear mi cuenta". 6.
Texto auxiliar de privacidad/condiciones. 7. Enlaces legales y aviso de
edad/jurisdicción.

Composición: - Card compacta y centrada. - En móvil, ancho completo
menos márgenes. - En escritorio, ancho máximo aproximado de 440--500
px. - Fondo con iluminación radial tenue.

Estados: - Inicial. - Validación. - Enviando. - Error de servidor. - Sin
conexión. - Backend no configurado. - Registro confirmado.

El estado de confirmación no se puede activar desde el cliente sin
respuesta exitosa del backend.

### 6.2 Confirmación de cuenta

Estructura: 1. Icono de éxito. 2. Título "¡Cuenta creada!". 3. Datos que
el backend haya devuelto y que el producto necesite mostrar. 4. Acción
de copiar para cada dato. 5. CTA "Continuar a mi cuenta". 6. Texto de
ayuda.

No almacenar contraseñas en texto plano. Si se muestra una clave
temporal, hacerlo solo cuando el flujo real la requiera y con
instrucciones claras.

### 6.3 Plataforma

-   Header compacto con marca y acciones disponibles reales.
-   Área principal flexible.
-   Integración embebida solo si la plataforma permite iframe.
-   Si no se puede embeber, mostrar una pantalla puente con CTA para
    abrir el sitio oficial.
-   No inventar secciones, saldo, resultados, notificaciones ni datos de
    la plataforma externa.

### 6.4 Chat

**Móvil** - Bottom sheet de hasta 85dvh. - Bordes superiores
redondeados. - Cabecera fija. - Mensajes con scroll independiente. -
Composer fijo en la parte inferior. - Minimizar a burbuja. - Safe areas
y teclado virtual contemplados.

**Escritorio** - Ventana flotante abajo a la derecha. - Ancho aproximado
340--390 px. - Alto máximo aproximado 650 px o 80vh. - Header fijo y
composer fijo.

Contenido: - Mensaje inicial desde backend o configuración verificada. -
Datos bancarios solo si están configurados y vigentes. - Acciones
rápidas Cargar, Retirar y Soporte. - Adjuntos con preview y estados de
carga. - Estado de conexión real.

Nunca confirmar recepción de un mensaje o comprobante sin respuesta del
servidor.

### 6.5 Instalación

-   Modal contextual con marca.
-   Android/Chrome: usar `beforeinstallprompt` cuando esté disponible.
-   iOS/Safari: mostrar pasos manuales reales para "Compartir" →
    "Agregar a pantalla de inicio".
-   Ofrecer continuar en navegador.
-   Ocultar CTA si ya está instalada.
-   No asegurar que las advertencias del sistema sean inofensivas ni
    recomendar ignorarlas.

### 6.6 Notificaciones

Estados: - `default`: permiso aún no solicitado. - `granted`: permiso
concedido. - `denied`: permiso bloqueado. - `unsupported`: navegador no
compatible.

Solicitar permiso solo tras acción explícita del usuario. Push real
requiere service worker, Push API y backend. No simular notificaciones
de premios, bonos o actividad.

------------------------------------------------------------------------

## 7. Iconografía e ilustración

-   Preferir una única familia de iconos consistente.
-   Usar iconos lineales simples, con grosor uniforme.
-   Evitar mezclar emojis, SVGs de estilos distintos e iconos de
    múltiples librerías.
-   Los emojis pueden aparecer en microcopy informal, pero no deben
    sustituir iconografía funcional.
-   Todo icono interactivo debe tener nombre accesible.
-   Las ilustraciones deben ser originales y optimizadas.

------------------------------------------------------------------------

## 8. Movimiento y microinteracciones

  Interacción         Duración orientativa Comportamiento
  ----------------- ---------------------- -------------------------------------
  Hover/focus                  140--180 ms Cambio sutil de borde/fondo
  Press                        100--140 ms Escala mínima o cambio de elevación
  Entrada de card              180--220 ms Fade y desplazamiento corto
  Toast                        160--200 ms Aparición/desaparición suave
  Bottom sheet                 200--260 ms Deslizamiento controlado

-   Respetar `prefers-reduced-motion`.
-   No usar animaciones infinitas decorativas.
-   No bloquear acciones mientras se reproduce una animación.
-   Mantener fluidez en dispositivos de gama media.

------------------------------------------------------------------------

## 9. Accesibilidad

-   Objetivo WCAG 2.2 AA cuando sea viable.
-   Contraste suficiente.
-   Navegación completa por teclado.
-   Foco visible.
-   Labels asociados a inputs.
-   Botones con nombres accesibles.
-   Errores asociados al campo correspondiente.
-   Estados comunicados por texto además de color.
-   `aria-live` para confirmaciones y errores dinámicos.
-   Orden de tabulación lógico.
-   Respetar zoom del navegador y tamaños de fuente del sistema.
-   Targets táctiles de al menos 44×44 px.

------------------------------------------------------------------------

## 10. Contenido y tono

Idioma: español argentino claro y natural.

Preferir: - "Creá tu cuenta" - "Ingresá tu nombre o apodo" - "Crear mi
cuenta" - "Continuar a mi cuenta" - "Cargar" - "Retirar" - "Soporte" -
"Adjuntar comprobante" - "Instalar app" - "Entrar sin instalar" -
"Activar notificaciones" - "Ahora no"

Evitar promesas de ganancias, resultados garantizados, bonos asegurados
o mensajes que presionen a apostar o recuperar pérdidas. Los textos
legales deben ser configurables y revisados por profesionales
competentes.

------------------------------------------------------------------------

## 11. Estados de sistema

Cada operación asíncrona debe contemplar:

-   `idle`
-   `loading`
-   `success` (confirmado por servidor)
-   `error`
-   `offline`
-   `not-configured`
-   `unauthorized` / sesión vencida, si aplica

Los errores deben explicar la situación y ofrecer una acción concreta.
No mostrar trazas, stack traces ni mensajes internos del servidor al
usuario.

------------------------------------------------------------------------

## 12. Seguridad visual y confianza

-   No mostrar datos bancarios ficticios.
-   No mostrar credenciales de ejemplo como si fueran reales.
-   No afirmar que un comprobante fue recibido sin confirmación.
-   No mostrar estados de conexión inventados.
-   No afirmar que una app es "100% segura".
-   No inducir a ignorar advertencias del sistema operativo.
-   No presentar licencias o autorizaciones no verificadas.
-   No guardar contraseñas, tokens sensibles o comprobantes en
    almacenamiento local no seguro.

------------------------------------------------------------------------

## 13. Checklist de revisión visual

### Móvil

-   [ ] 320 px: no hay desbordamiento horizontal.
-   [ ] 360 px: formulario y CTA cómodos.
-   [ ] 390 px: márgenes y jerarquía equilibrados.
-   [ ] Teclado abierto: composer visible.
-   [ ] Safe areas respetadas.
-   [ ] Bottom sheet desplazable y minimizable.

### Tablet y escritorio

-   [ ] Contenido centrado y con ancho máximo.
-   [ ] No hay estiramiento excesivo.
-   [ ] Chat flotante no tapa controles importantes.
-   [ ] Navegación y foco por teclado funcionan.

### Sistema visual

-   [ ] Tokens aplicados consistentemente.
-   [ ] Logo original y legible.
-   [ ] Contraste adecuado.
-   [ ] Estados de botones completos.
-   [ ] Animaciones discretas y accesibles.
-   [ ] Sin recursos visuales copiados de las referencias.

### Integridad funcional

-   [ ] No se simulan registros, depósitos, retiros ni envíos.
-   [ ] Datos bancarios solo desde configuración verificada.
-   [ ] Instalación contextual por navegador.
-   [ ] Notificaciones con consentimiento explícito.
-   [ ] No se almacenan secretos en `localStorage`.

------------------------------------------------------------------------

## 14. Criterio de aprobación

El diseño se considera aprobado cuando las pantallas mantienen una
identidad coherente, funcionan correctamente desde 320 px hasta
escritorio, tienen estados completos, son accesibles, no presentan datos
ficticios como reales y respetan la arquitectura y funcionalidades
preexistentes del proyecto.

Este documento define el lenguaje visual y los criterios de experiencia.
Los contratos de API, textos legales, datos bancarios, permisos y reglas
comerciales deben ser confirmados por el propietario del producto y su
equipo técnico/legal.
