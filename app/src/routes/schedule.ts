import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import { auth } from '../http/security.js'

/** Carrega a agenda e registra ou conclui agendamentos do usuário. */
export function registerScheduleRoutes(app: FastifyInstance) {
  // Carrega compromissos e clientes; a página separa os compromissos por situação.
  app.get('/agenda', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const [appointments, clients] = await Promise.all([
      db.agendamento.findMany({
        where: { usuarioId: user.id },
        include: { cliente: true },
        orderBy: { inicio: 'asc' },
      }),
      db.cliente.findMany({
        where: { usuarioId: user.id, arquivadoEm: null },
        orderBy: { nomeCliente: 'asc' },
      }),
    ])
    return page(request, reply, 'Schedule', {
      user: { nome: user.nome },
      appointments: appointments.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        inicio: item.inicio.toISOString(),
        fim: item.fim?.toISOString() ?? null,
        concluidoEm: item.concluidoEm?.toISOString() ?? null,
        cliente: item.cliente?.nomeCliente ?? null,
      })),
      clients: clients.map((item) => ({ id: item.id, nome: item.nomeCliente })),
    })
  })
  // Valida horários e cria um compromisso opcionalmente ligado a um cliente.
  app.post('/agenda', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const input = body(request)
      const inicio = new Date(required(input.inicio, 'a data e hora'))
      const fim = input.fim ? new Date(String(input.fim)) : null
      if (Number.isNaN(inicio.getTime()) || (fim && (Number.isNaN(fim.getTime()) || fim <= inicio)))
        throw new Error('Data ou horário inválido.')
      if (
        input.clienteId &&
        !(await db.cliente.findFirst({
          where: { id: String(input.clienteId), usuarioId: user.id },
        }))
      )
        throw new Error('Cliente não encontrado.')
      await db.agendamento.create({
        data: {
          usuarioId: user.id,
          clienteId: input.clienteId ? String(input.clienteId) : null,
          titulo: required(input.titulo, 'o título do agendamento'),
          descricao: String(input.descricao ?? '').trim() || null,
          inicio,
          fim,
        },
      })
      return redirect(reply, '/agenda', 'sucesso', 'Serviço agendado.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Marca a conclusão somente de um agendamento ainda aberto.
  app.post<{ Params: { id: string } }>('/agenda/:id/concluir', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const updated = await db.agendamento.updateMany({
      where: { id: request.params.id, usuarioId: user.id, concluidoEm: null },
      data: { concluidoEm: new Date() },
    })
    return redirect(
      reply,
      '/agenda',
      updated.count ? 'sucesso' : 'erro',
      updated.count ? 'Agendamento concluído.' : 'Agendamento não encontrado.',
    )
  })
}
