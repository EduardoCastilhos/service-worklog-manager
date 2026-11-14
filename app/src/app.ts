import 'dotenv/config'
import { existsSync } from 'node:fs'
import path from 'node:path'
import fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { redirect } from './http/inertia.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerDashboardRoutes } from './routes/dashboard.js'
import { registerClientRoutes } from './routes/clients.js'
import { registerServiceRoutes } from './routes/services.js'
import { registerFinanceRoutes } from './routes/finances.js'
import { registerScheduleRoutes } from './routes/schedule.js'
import { registerSettingsRoutes } from './routes/settings.js'

// Configura a aplicação HTTP usada tanto pelo servidor local quanto pela Vercel.
const app = fastify({ logger: true })
const dist = path.join(process.cwd(), 'dist')

// Entrega os arquivos compilados do React pela mesma origem das rotas Inertia.
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist, prefix: '/', decorateReply: false })
}

// Recusa alterações originadas de outro host antes de executar qualquer rota.
app.addHook('onRequest', async (request, reply) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.origin
    if (origin && new URL(origin).host !== request.headers.host) {
      return reply.code(403).send({ error: 'Origem não permitida.' })
    }
  }
})

// Agrupa os endpoints por área funcional.
registerAuthRoutes(app)
registerDashboardRoutes(app)
registerClientRoutes(app)
registerServiceRoutes(app)
registerFinanceRoutes(app)
registerScheduleRoutes(app)
registerSettingsRoutes(app)

// Mantém respostas Inertia navegáveis mesmo quando ocorre uma falha inesperada.
app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  if (request.headers['x-inertia']) {
    return redirect(reply, '/', 'erro', 'Ocorreu um erro inesperado. Tente novamente.')
  }
  return reply.code(500).send('Ocorreu um erro inesperado.')
})

export default app
