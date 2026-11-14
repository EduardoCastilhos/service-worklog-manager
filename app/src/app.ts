import 'dotenv/config'
import { createReadStream, existsSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastify from 'fastify'
import type { FastifyReply } from 'fastify'
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
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const buildDir = path.join(publicDir, 'build')
const assetTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** Entrega um arquivo público tanto localmente quanto na função da Vercel. */
function sendAsset(reply: FastifyReply, filePath: string) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return reply.code(404).send()
  return reply
    .type(assetTypes[path.extname(filePath)] ?? 'application/octet-stream')
    .send(createReadStream(filePath))
}

// Expõe somente o favicon e os arquivos compilados, sem permitir sair de public/build.
app.get('/favicon.svg', (_request, reply) => sendAsset(reply, path.join(publicDir, 'favicon.svg')))
app.get('/build/*', (request, reply) => {
  const relativePath = (request.params as { '*': string })['*']
  const filePath = path.resolve(buildDir, relativePath)
  const insideBuild = path.relative(buildDir, filePath)
  if (
    !insideBuild ||
    insideBuild === '..' ||
    insideBuild.startsWith(`..${path.sep}`) ||
    path.isAbsolute(insideBuild)
  )
    return reply.code(404).send()
  return sendAsset(reply, filePath)
})

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

// Expõe o formato (requisição, resposta) reconhecido pela função da Vercel.
export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await app.ready()
  app.server.emit('request', request, response)
}

export { app }
