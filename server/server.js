import { buildApp } from './app.js'
import { loadConfig } from './config/env.js'

const config = loadConfig()
const app = await buildApp({ config })

const shutdown = async (signal) => {
  app.log.info({ signal }, 'Cerrando servidor')
  try {
    await app.close()
    process.exit(0)
  } catch (error) {
    app.log.error({ err: error }, 'Error al cerrar el servidor')
    process.exit(1)
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port: config.port, host: config.host })
  app.log.info(
    {
      port: config.port,
      host: config.host,
      agentConfigured: Boolean(config.agentUser && config.agentPass),
    },
    'Ganamos backend iniciado',
  )
} catch (error) {
  app.log.error({ err: error }, 'No se pudo iniciar el servidor')
  process.exit(1)
}
