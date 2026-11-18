import http from 'node:http'

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function json(response, status, body, extraHeaders = {}) {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=UTF-8',
    'content-length': Buffer.byteLength(text),
    ...extraHeaders,
  })
  response.end(text)
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: 0,
    balance: String(user.balance),
    bonus_balance: '0',
    currency: user.currency || 'ARS',
    is_banned: false,
  }
}

/**
 * Panel mock con el contrato verificado del panel real:
 * - login POST /api/user/login -> status 0 (cookie spid) / 400 status -3
 * - no autorizado -> HTTP 200 status 1 "Unauthorized"
 * - búsqueda GET /api/agent_admin/user/search/?... -> result.data[]
 * - creación POST /api/agent_admin/user/ -> status 0
 * - info GET /api/agent_admin/user/:id/ -> result.user
 */
export async function startMockPanel(overrides = {}) {
  const state = {
    agentUser: 'agent',
    agentPass: 'secret',
    users: new Map(),
    nextId: 1,
    createAttempts: 0,
    lastCreatePayload: null,
    duplicateOnce: false,
    createDelayMs: 0,
    insertBeforeDelay: false,
    failInfo: false,
    forceUnauthorizedOnce: false,
    alwaysDuplicate: false,
    defaultBalance: 0,
    loginDelayMs: 0,
    requests: [],
    ...overrides,
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1')
    state.requests.push(`${request.method} ${url.pathname}${url.search}`)

    const cookie = request.headers.cookie || ''
    const hasSession = /(?:^|;\s*)spid=session(?:;|$)/.test(cookie)

    try {
      if (request.method === 'POST' && url.pathname === '/api/user/login') {
        const body = JSON.parse((await readBody(request)) || '{}')
        if (state.loginDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, state.loginDelayMs))
        }
        if (body.username !== state.agentUser || body.password !== state.agentPass) {
          return json(response, 400, {
            status: -3,
            result: {},
            error_message: 'Invalid login or password',
          })
        }
        return json(
          response,
          200,
          { status: 0, result: {} },
          { 'set-cookie': 'spid=session; Path=/; HttpOnly; SameSite=Lax' },
        )
      }

      if (!hasSession) {
        return json(response, 200, {
          status: 1,
          result: {},
          error_message: 'Unauthorized',
        })
      }

      if (state.forceUnauthorizedOnce) {
        state.forceUnauthorizedOnce = false
        return json(response, 200, {
          status: 1,
          result: {},
          error_message: 'Unauthorized',
        })
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/api/agent_admin/user/search/'
      ) {
        const username = (url.searchParams.get('username') || '').toLowerCase()
        const users = [...state.users.values()]
          .filter((user) => user.username.toLowerCase().includes(username))
          .map(publicUser)
        return json(response, 200, { status: 0, result: { data: users } })
      }

      if (request.method === 'GET' && url.pathname === '/api/agent_admin/user/') {
        const username = (url.searchParams.get('username') || '').toLowerCase()
        const users = [...state.users.values()]
          .filter((user) => user.username.toLowerCase().includes(username))
          .map(publicUser)
        return json(response, 200, {
          status: 0,
          result: { users, total_count: users.length },
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/agent_admin/user/') {
        state.createAttempts += 1
        const body = JSON.parse((await readBody(request)) || '{}')
        state.lastCreatePayload = body

        if (state.duplicateOnce && state.createAttempts === 1) {
          state.duplicateOnce = false
          return json(response, 200, {
            status: 4,
            result: {},
            error_message: 'User with this username already exists',
          })
        }

        if (state.alwaysDuplicate) {
          return json(response, 200, {
            status: 4,
            result: {},
            error_message: 'User with this username already exists',
          })
        }

        if (state.users.has(body.username)) {
          return json(response, 200, {
            status: 4,
            result: {},
            error_message: 'User with this username already exists',
          })
        }

        const user = {
          id: state.nextId,
          username: body.username,
          balance: state.defaultBalance,
          currency: 'ARS',
        }
        state.nextId += 1

        if (state.insertBeforeDelay) state.users.set(user.username, user)

        if (state.createDelayMs > 0 && !state.insertBeforeDelay) {
          await new Promise((resolve) => setTimeout(resolve, state.createDelayMs))
        }

        if (!state.insertBeforeDelay) state.users.set(user.username, user)

        if (state.insertBeforeDelay && state.createDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, state.createDelayMs))
        }

        return json(response, 200, { status: 0, result: {} })
      }

      const infoMatch = /^\/api\/agent_admin\/user\/(\d+)\/$/.exec(url.pathname)
      if (request.method === 'GET' && infoMatch) {
        if (state.failInfo) {
          return json(response, 500, {
            status: -1,
            result: {},
            error_message: 'Panel temporalmente fuera de servicio',
          })
        }

        const user = [...state.users.values()].find(
          (item) => String(item.id) === infoMatch[1],
        )
        if (!user) {
          return json(response, 404, {
            status: 4,
            result: {},
            error_message: 'User not found',
          })
        }

        return json(response, 200, {
          status: 0,
          result: { user: publicUser(user) },
        })
      }

      return json(response, 404, {
        status: 4,
        result: {},
        error_message: 'Not found',
      })
    } catch (error) {
      return json(response, 500, {
        status: -1,
        result: {},
        error_message: error?.message || 'Mock error',
      })
    }
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  return {
    url: `http://127.0.0.1:${port}`,
    state,
    addUser({ username, balance = 0, currency = 'ARS' }) {
      const user = { id: state.nextId, username, balance, currency }
      state.nextId += 1
      state.users.set(username, user)
      return user
    },
    setBalance(username, balance) {
      const user = state.users.get(username)
      if (user) user.balance = balance
    },
    close() {
      return new Promise((resolve) => server.close(resolve))
    },
  }
}
