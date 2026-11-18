export default async function healthRoutes(app, { db, config }) {
  app.get(
    '/api/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              chat_enabled: { type: 'boolean' },
              agent_configured: { type: 'boolean' },
              database: { type: 'string' },
              time: { type: 'string' },
            },
            required: ['ok', 'chat_enabled', 'agent_configured', 'database', 'time'],
          },
        },
      },
    },
    async (request, reply) => {
      let database = 'ok'
      try {
        db.ping()
      } catch {
        database = 'error'
      }

      if (database !== 'ok') {
        reply.code(503)
        return {
          ok: false,
          chat_enabled: false,
          agent_configured: Boolean(config.agentUser && config.agentPass),
          database,
          time: new Date().toISOString(),
        }
      }

      return {
        ok: true,
        chat_enabled: true,
        agent_configured: Boolean(config.agentUser && config.agentPass),
        database,
        time: new Date().toISOString(),
      }
    },
  )
}
