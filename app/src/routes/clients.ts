import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import { auth } from '../http/security.js'

/** Normaliza os campos compartilhados pela criação e edição de clientes. */
function clientData(input: Record<string, unknown>) {
  return {
    nomeCliente: required(input.nome, 'o nome do cliente'),
    telefone: String(input.telefone ?? '').trim() || null,
    email: String(input.email ?? '').trim() || null,
    endereco: String(input.endereco ?? '').trim() || null,
    documento: String(input.documento ?? '').trim() || null,
    observacoes: String(input.observacoes ?? '').trim() || null,
  }
}

/** Lista, cria e atualiza clientes pertencentes ao usuário autenticado. */
export function registerClientRoutes(app: FastifyInstance) {
  // Carrega a lista e os dados necessários aos formulários.
  app.get('/clientes', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const clients = await db.cliente.findMany({
      where: { usuarioId: user.id, arquivadoEm: null },
      orderBy: { nomeCliente: 'asc' },
    })
    return page(request, reply, 'Clients', {
      user: { nome: user.nome },
      clients: clients.map((item) => ({
        id: item.id,
        nome: item.nomeCliente,
        telefone: item.telefone,
        email: item.email,
        endereco: item.endereco,
        documento: item.documento,
        observacoes: item.observacoes,
      })),
    })
  })
  // Cria um cliente ativo com os campos normalizados.
  app.post('/clientes', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      await db.cliente.create({
        data: { usuarioId: user.id, ...clientData(body(request)) },
      })
      return redirect(reply, '/clientes', 'sucesso', 'Cliente cadastrado.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Restringe a edição ao cliente identificado dentro da conta atual.
  app.put<{ Params: { id: string } }>('/clientes/:id', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const result = await db.cliente.updateMany({
        where: { id: request.params.id, usuarioId: user.id, arquivadoEm: null },
        data: clientData(body(request)),
      })
      if (!result.count) throw new Error('Cliente não encontrado.')
      return redirect(reply, '/clientes', 'sucesso', 'Cliente atualizado.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
}
