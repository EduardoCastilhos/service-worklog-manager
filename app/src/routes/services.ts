import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { cents, dateOnly, decimal, totalOrdem } from '../domain.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import { auth } from '../http/security.js'
import {
  createMaterialPayables,
  orderInclude,
  ordersFor,
  recordData,
  serializeOrder,
} from '../services/orders.js'

// Formas de pagamento aceitas ao registrar um recebimento.
const paymentMethods = [
  'PIX',
  'DINHEIRO',
  'TRANSFERENCIA',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'OUTRO',
] as const

/** Restringe a entrada ao enum persistido no banco. */
function isPaymentMethod(value: string): value is (typeof paymentMethods)[number] {
  return paymentMethods.some((method) => method === value)
}

/** Expõe histórico, cadastro, etapas, conclusão e recebimentos de serviços. */
export function registerServiceRoutes(app: FastifyInstance) {
  // Lista as ordens do usuário autenticado.
  app.get('/servicos', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    return page(request, reply, 'Services', {
      user: { nome: user.nome },
      orders: await ordersFor(user.id),
    })
  })
  // Fornece clientes e tarifas necessárias ao formulário de novo serviço.
  app.get('/servicos/novo', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const clients = await db.cliente.findMany({
      where: { usuarioId: user.id, arquivadoEm: null },
      orderBy: { nomeCliente: 'asc' },
    })
    return page(request, reply, 'NewService', {
      user: { nome: user.nome },
      clients: clients.map((item) => ({ id: item.id, nome: item.nomeCliente })),
      rates: {
        valorHora: Number(user.valorHora),
        valorDeslocamento: Number(user.valorDeslocamento),
      },
      ratesConfigured: user.tarifasConfiguradas,
    })
  })

  // Salva ordem, primeira etapa e contas dos materiais em uma transação.
  app.post('/servicos', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    if (!user.tarifasConfiguradas)
      return redirect(
        reply,
        '/servicos/novo',
        'erro',
        'Cadastre suas tarifas antes de salvar um serviço.',
      )
    try {
      const input = body(request)
      const client = await db.cliente.findFirst({
        where: {
          id: required(input.clienteId, 'um cliente'),
          usuarioId: user.id,
          arquivadoEm: null,
        },
      })
      if (!client) throw new Error('Cliente não encontrado.')
      const continuar = Boolean(input.continuar)
      await db.$transaction(async (tx) => {
        const order = await tx.ordemServico.create({
          data: {
            usuarioId: user.id,
            clienteId: client.id,
            nomeServico: required(input.nomeServico, 'o nome do serviço'),
            descricao: String(input.descricao ?? '').trim(),
            situacao: continuar ? 'EM_ANDAMENTO' : 'CONCLUIDO',
            comecoServico: dateOnly(required(input.data, 'a data do serviço')),
            terminoServico: continuar ? null : new Date(),
            vencimentoPagamento: input.vencimento ? dateOnly(String(input.vencimento)) : null,
            desconto: decimal(cents(input.desconto ?? 0)),
            acrescimo: decimal(cents(input.acrescimo ?? 0)),
            registrosServico: { create: recordData(input, user) },
          },
          include: { registrosServico: true },
        })
        const firstRecord = order.registrosServico[0]
        if (!firstRecord) throw new Error('Não foi possível criar a primeira etapa.')
        await createMaterialPayables(tx, user.id, order.id, firstRecord.id)
      })
      return redirect(
        reply,
        '/servicos/novo',
        'sucesso',
        'Serviço registrado. Você já pode adicionar outro.',
      )
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Carrega uma ordem completa para a página de detalhes.
  app.get<{ Params: { id: string } }>('/servicos/:id', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const order = await db.ordemServico.findFirst({
      where: { id: request.params.id, usuarioId: user.id },
      include: orderInclude,
    })
    if (!order) return reply.code(404).send('Serviço não encontrado.')
    return page(request, reply, 'ServiceDetail', {
      user: { nome: user.nome },
      order: serializeOrder(order),
      rates: {
        valorHora: Number(user.valorHora),
        valorDeslocamento: Number(user.valorDeslocamento),
      },
    })
  })
  // Acrescenta uma etapa a uma ordem aberta e cria as contas ligadas aos materiais.
  app.post<{ Params: { id: string } }>('/servicos/:id/registros', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const order = await db.ordemServico.findFirst({
        where: { id: request.params.id, usuarioId: user.id },
      })
      if (!order || order.situacao === 'CANCELADO') throw new Error('Serviço não encontrado.')
      if (order.situacao === 'CONCLUIDO')
        throw new Error('Reabra o serviço antes de adicionar um registro.')
      await db.$transaction(async (tx) => {
        const record = await tx.registroServico.create({
          data: { ordemDeServicoId: order.id, ...recordData(body(request), user) },
        })
        await tx.ordemServico.update({
          where: { id: order.id },
          data: { situacao: 'EM_ANDAMENTO' },
        })
        await createMaterialPayables(tx, user.id, order.id, record.id)
      })
      return redirect(reply, `/servicos/${order.id}`, 'sucesso', 'Etapa adicionada ao serviço.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Fecha uma ordem ativa, preservando o saldo financeiro em aberto.
  app.post<{ Params: { id: string } }>('/servicos/:id/concluir', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const updated = await db.ordemServico.updateMany({
      where: {
        id: request.params.id,
        usuarioId: user.id,
        situacao: { in: ['ABERTO', 'EM_ANDAMENTO'] },
      },
      data: { situacao: 'CONCLUIDO', terminoServico: new Date() },
    })
    return redirect(
      reply,
      `/servicos/${request.params.id}`,
      updated.count ? 'sucesso' : 'erro',
      updated.count ? 'Serviço concluído.' : 'Não foi possível concluir o serviço.',
    )
  })
  // Reabre uma ordem concluída para permitir novas etapas.
  app.post<{ Params: { id: string } }>('/servicos/:id/reabrir', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const updated = await db.ordemServico.updateMany({
      where: { id: request.params.id, usuarioId: user.id, situacao: 'CONCLUIDO' },
      data: { situacao: 'EM_ANDAMENTO', terminoServico: null },
    })
    return redirect(
      reply,
      `/servicos/${request.params.id}`,
      updated.count ? 'sucesso' : 'erro',
      updated.count ? 'Serviço reaberto.' : 'Não foi possível reabrir o serviço.',
    )
  })
  // Trava a ordem durante a transação para impedir recebimentos acima do saldo.
  app.post<{ Params: { id: string } }>('/servicos/:id/receber', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const input = body(request)
      const forma = String(input.forma ?? 'PIX')
      if (!isPaymentMethod(forma)) throw new Error('Forma de pagamento inválida.')
      await db.$transaction(async (tx) => {
        const locked = await tx.ordemServico.updateMany({
          where: { id: request.params.id, usuarioId: user.id },
          data: { atualizadoEm: new Date() },
        })
        if (!locked.count) throw new Error('Serviço não encontrado.')
        const order = await tx.ordemServico.findFirst({
          where: { id: request.params.id, usuarioId: user.id },
          include: orderInclude,
        })
        if (!order) throw new Error('Serviço não encontrado.')
        const remaining = totalOrdem(order).restante
        const amount =
          input.valor === undefined || input.valor === '' ? remaining : cents(input.valor)
        if (amount <= 0 || amount > remaining)
          throw new Error('O valor recebido deve ser maior que zero e não pode exceder o saldo.')
        await tx.pagamentoRecebido.create({
          data: {
            ordemDeServicoId: order.id,
            montanteRecebido: decimal(amount),
            pagoEm: new Date(),
            formaPagamento: forma,
            observacoes: String(input.observacoes ?? '').trim() || null,
          },
        })
      })
      return redirect(reply, `/servicos/${request.params.id}`, 'sucesso', 'Recebimento registrado.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
}
