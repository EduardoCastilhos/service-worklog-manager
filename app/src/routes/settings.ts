import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { cents, decimal } from '../domain.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import { auth } from '../http/security.js'

/** Valida as tarifas antes de gravá-las no perfil. */
function ratesFrom(input: Record<string, unknown>) {
  return {
    valorHora: decimal(cents(required(input.valorHora, 'o valor da hora'))),
    valorDeslocamento: decimal(cents(required(input.valorDeslocamento, 'o valor do deslocamento'))),
    tarifasConfiguradas: true,
  }
}

/** Mostra e atualiza dados de perfil e tarifas de serviço. */
export function registerSettingsRoutes(app: FastifyInstance) {
  // Exibe os valores atualmente cadastrados.
  app.get('/configuracoes', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    return page(request, reply, 'Settings', {
      user: { nome: user.nome },
      settings: {
        nome: user.nome,
        email: user.email,
        valorHora: Number(user.valorHora),
        valorDeslocamento: Number(user.valorDeslocamento),
        tarifasConfiguradas: user.tarifasConfiguradas,
      },
    })
  })
  // Salva os dados da página de configurações.
  app.post('/configuracoes', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const input = body(request)
      await db.usuario.update({
        where: { id: user.id },
        data: {
          nome: required(input.nome, 'seu nome'),
          ...ratesFrom(input),
        },
      })
      return redirect(
        reply,
        '/configuracoes',
        'sucesso',
        'Valores atualizados. Os registros antigos mantêm as tarifas originais.',
      )
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Permite cadastrar tarifas a partir do aviso exibido no primeiro serviço.
  app.post('/configuracoes/tarifas', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      await db.usuario.update({
        where: { id: user.id },
        data: ratesFrom(body(request)),
      })
      return redirect(reply, '/servicos/novo', 'sucesso', 'Tarifas salvas. Continue o serviço.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
}
