import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { isoDate } from '../domain.js'
import { page } from '../http/inertia.js'
import { auth } from '../http/security.js'
import { ordersFor } from '../services/orders.js'

/** Monta os indicadores e listas resumidas da visão geral. */
export function registerDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const [orders, bills, appointments] = await Promise.all([
      ordersFor(user.id),
      db.contaPagar.findMany({
        where: { usuarioId: user.id, pagoEm: null },
        orderBy: { vencimento: 'asc' },
      }),
      db.agendamento.findMany({
        where: {
          usuarioId: user.id,
          concluidoEm: null,
          inicio: { gte: new Date(Date.now() - 86400000) },
        },
        include: { cliente: true },
        orderBy: { inicio: 'asc' },
        take: 6,
      }),
    ])
    return page(request, reply, 'Dashboard', {
      user: { nome: user.nome },
      orders: orders.slice(0, 5),
      receivables: orders
        .filter((order) => order.totals.restante > 0)
        .sort((a, b) =>
          (a.vencimentoPagamento ?? '9999').localeCompare(b.vencimentoPagamento ?? '9999'),
        )
        .slice(0, 6),
      bills: bills.slice(0, 6).map((bill) => ({
        id: bill.id,
        descricao: bill.descricao,
        valor: Number(bill.valor),
        vencimento: isoDate(bill.vencimento),
      })),
      appointments: appointments.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        inicio: item.inicio.toISOString(),
        cliente: item.cliente?.nomeCliente ?? null,
      })),
      metrics: {
        emAberto: orders.filter((order) => ['ABERTO', 'EM_ANDAMENTO'].includes(order.situacao))
          .length,
        aReceber: orders.reduce((sum, order) => sum + order.totals.restante, 0),
        aPagar: bills.reduce((sum, bill) => sum + Number(bill.valor), 0),
      },
    })
  })
}
