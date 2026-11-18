# Backend de Ganamos

Servidor **Node.js + Fastify** (ES Modules) que registra jugadores reales en el
panel de agentes de `https://agents.ganamos.net` y consulta su saldo real para
que el chat de la PWA lo muestre en la tarjeta RETIRAR.

Persistencia: **SQLite** a través de `node:sqlite` (`DatabaseSync`, Node ≥ 24).
Sin dependencias nativas.

## Endpoints

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servicio y de la configuración del agente | — |
| `POST` | `/api/register-player` | Crea/recupera la cuenta real del jugador (idempotente por `clientId`) | — |
| `GET` | `/api/player-balance` | Saldo real del jugador desde el panel | `Authorization: Bearer <token>` |
| `POST` | `/api/chat/messages` | Registra un mensaje/solicitud del chat | token |
| `POST` | `/api/chat/receipts` | Guarda un comprobante (JPG/PNG/WebP/PDF, ≤10 MB) | token |

### `POST /api/register-player`

Entrada:

```json
{
  "clientId": "uuid",
  "name": "Omar",
  "utm_source": null,
  "utm_medium": null,
  "utm_campaign": null,
  "utm_term": null,
  "utm_content": null,
  "fbclid": null
}
```

Salida:

```json
{
  "success": true,
  "user": { "id": "...", "username": "omar49752", "temporaryPassword": "12345a", "createdAt": "..." },
  "token": "<player token>"
}
```

Comportamiento:

- **Idempotente** por `clientId`: repetir (doble tap, refresh, reconexión,
  reinicio del servidor) devuelve la misma cuenta y el mismo token. Se protege
  con restricción `UNIQUE` y single-flight en memoria + espera atómica.
- Genera `nombreLimpio + 5 dígitos` (hasta 5 intentos si el username está ocupado).
- **Nunca** interpreta un HTTP 200 como éxito: confirma la creación consultando
  al panel. Si hay timeout después de enviar, busca primero si la cuenta quedó
  creada antes de reintentar (evita duplicados).
- Si no se confirma, devuelve un error controlado. Nunca crea una cuenta ficticia.

### `GET /api/player-balance`

Identifica al jugador por su token individual (no por username en la URL). Si el
panel no responde, conserva el último saldo confirmado y responde `stale: true`;
sin saldo previo devuelve `502` con `error: PANEL_UNAVAILABLE` (nunca `$0` ficticio).

```json
{ "success": true, "username": "omar49752", "balance": 25000, "currency": "ARS", "updatedAt": "2026-11-18T20:30:00.000Z", "stale": false }
```

## Variables de entorno

Copiá `server/.env.example` a `server/.env`:

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del backend |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `AGENT_BASE_URL` | `https://agents.ganamos.net` | Base del panel de agentes |
| `AGENT_USER` | — | Usuario del agente (obligatorio) |
| `AGENT_PASS` | — | Contraseña del agente (obligatorio) |
| `DATABASE_URL` | `./data/ganamos.db` | Ruta de SQLite (relativa a `server/`) |
| `FRONTEND_ORIGIN` | `http://localhost:5173,...` | Orígenes CORS permitidos (coma) |
| `AGENT_SESSION_TTL` | `1200` | Segundos que se reutiliza la sesión del agente |
| `AGENT_TIMEOUT_MS` | `12000` | Timeout por llamada al panel |
| `PLAYER_PASSWORD` | `12345a` | Contraseña emitida a los jugadores |
| `LOG_LEVEL` | `info` | Nivel de logs (pino) |
| `TRUST_PROXY` | `false` | Habilitar si está detrás de un proxy |

Las credenciales del agente viven **solo** en `server/.env` y nunca se exponen
en respuestas ni logs (se redactan `authorization`, `cookie`, `password`, `token`).

## Contrato del panel verificado

Extraído del bundle real de `agents.ganamos.net` (el cliente usa `new h5e("")`,
mismo origen):

- Login: `POST /api/user/login` `{ username, password }`.
  Éxito = HTTP 200 + `body.status === 0`. Credenciales inválidas = HTTP 400 +
  `body.status === -3` / `"Invalid login or password"`.
- No autorizado: HTTP 200 + `body.status === 1` / `"Unauthorized"` (no solo 401/403).
- Sesión por cookies httpOnly (`spid`, `spsc`) conservadas en un cookie jar y
  reenviadas en cada petición. Renovación con single-flight y un único reintento.
- Crear jugador: `POST /api/agent_admin/user/`
  `{ username, password, email: "", first_name: "", last_name: "", role: 0 }`.
- Buscar: `GET /api/agent_admin/user/search/?username=<u>&is_direct_structure=false`
  → `result.data: [{ id, username, role, balance, ... }]`.
- Info (saldo): `GET /api/agent_admin/user/<id>/` →
  `result.user.balance`, `result.user.bonus_balance`, `result.user.currency`.
- Envelope: `result = body.result ?? body.data?.result ?? body.data`.

## Estructura

```
server/
├─ server.js             # arranque + graceful shutdown
├─ app.js                # buildApp (plugins, rutas, error handler)
├─ config/env.js         # variables de entorno
├─ database/database.js  # SQLite + migraciones + consultas preparadas
├─ services/
│  ├─ agentAuth.js       # cookie jar, login single-flight, renovación
│  ├─ agentApi.js        # adaptador del panel (crear/buscar/info)
│  ├─ playerService.js   # registro idempotente + generación de username
│  ├─ balanceService.js  # saldo normalizado + caché confirmada
│  └─ chatService.js     # mensajes y comprobantes
├─ routes/               # health, players, chat
├─ utils/                # username, errores, token
└─ test/                 # tests con panel mock (node:test)
```

## Puesta en marcha

```bash
cd server
npm install
cp .env.example .env   # completá AGENT_USER / AGENT_PASS
npm start              # http://localhost:3000/api/health
```

### Pruebas

```bash
cd server
npm test               # 26 casos con un panel mock basado en el contrato real
```

Cobertura: registro, idempotencia, concurrencia, duplicados, timeout de creación
sin duplicar, credenciales de agente inválidas, renovación de sesión, saldo
positivo/cero, strings numéricos, caída del panel (conserva último saldo, nunca
`$0`), aislamiento entre jugadores, chat y comprobantes.

Harness manual E2E (backend + panel mock en `:3000`):

```bash
cd server
node test/run-local-e2e.js
# y en otra terminal: npm run preview -- --port 4173 (desde la raíz)
```

## Limitaciones externas

- **Cloudflare bloquea peticiones server-side a `agents.ganamos.net`** desde la
  IP de este entorno de desarrollo (HTTP `403` HTML "If you are not a bot");
  el navegador sí carga el panel. Para producción es necesario que el operador
  habilite la IP del servidor (allowlist) o provea una API/credenciales oficiales.
  El adaptador detecta el bloqueo y responde `PANEL_UNAVAILABLE`, nunca un éxito
  falso.
- No se dispone de `AGENT_USER`/`AGENT_PASS` reales, por lo que la integración
  contra el panel vivo **no pudo verificarse end-to-end**. Toda la lógica se
  validó contra un mock que reproduce fielmente el contrato extraído del bundle.
