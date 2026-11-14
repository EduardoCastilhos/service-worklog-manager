import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { cents, dateOnly, decimal, isoDate } from '../domain.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import { auth } from '../http/security.js'
import { ordersFor } from '../services/orders.js'
import { buildFinanceReport } from '../services/finance-report.js'

/** Reúne o relatório financeiro e as rotas de recebíveis e contas a pagar. */
export function registerFinanceRoutes(app: FastifyInstance) {
  // Calcula o recorte financeiro no fuso do usuário e monta opções de filtro disponíveis.
  app.get('/financas', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const query = request.query as Record<string, string | undefined>
    const nowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: user.fusoHorario,
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(new Date())
    const currentYear = Number(nowParts.find((part) => part.type === 'year')?.value)
    const currentMonth = Number(nowParts.find((part) => part.type === 'month')?.value)
    const requestedYear = Number(query.ano)
    const year =
      Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
        ? requestedYear
        : currentYear
    const requestedMonth = Number(query.mes)
    const month =
      query.mes === 'todos'
        ? null
        : Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
          ? requestedMonth
          : currentMonth
    const [orders, rawBills] = await Promise.all([
      ordersFor(user.id),
      db.contaPagar.findMany({ where: { usuarioId: user.id } }),
    ])
    const bills = rawBills.map((bill) => ({
      id: bill.id,
      ordemServicoId: bill.ordemServicoId,
      materialServicoId: bill.materialServicoId,
      valor: Number(bill.valor),
      vencimento: isoDate(bill.vencimento)!,
      pagoEm: bill.pagoEm?.toISOString() ?? null,
    }))
    const clientId = query.clienteId || null
    const report = buildFinanceReport(orders, bills, year, month, clientId, user.fusoHorario)
    const availableYears = new Set<number>([currentYear, year])
    const paymentYear = (value: string) =>
      Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: user.fusoHorario,
          year: 'numeric',
        }).format(new Date(value)),
      )
    for (const order of orders) {
      availableYears.add(Number(order.comecoServico.slice(0, 4)))
      for (const record of order.registros)
        if (record.data) availableYears.add(Number(record.data.slice(0, 4)))
      for (const payment of order.pagamentos) availableYears.add(paymentYear(payment.pagoEm))
    }
    for (const bill of bills) {
      availableYears.add(Number(bill.vencimento.slice(0, 4)))
      if (bill.pagoEm) availableYears.add(paymentYear(bill.pagoEm))
    }
    return page(request, reply, 'FinanceOverview', {
      user: { nome: user.nome },
      report,
      filters: { year, month, clientId },
      years: [...availableYears].sort((a, b) => b - a),
    })
  })
  // Resume todas as ordens e lista apenas as que ainda possuem saldo.
  app.get('/receber', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const orders = await ordersFor(user.id)
    return page(request, reply, 'Receivables', {
      user: { nome: user.nome },
      totalRecebido: orders.reduce((sum, order) => sum + order.totals.recebido, 0),
      totalGeral: orders.reduce((sum, order) => sum + order.totals.total, 0),
      summaryOrders: orders.map((order) => ({
        id: order.id,
        nomeServico: order.nomeServico,
        cliente: order.cliente,
        vencimentoPagamento: order.vencimentoPagamento,
        totals: order.totals,
      })),
      orders: orders
        .filter((order) => order.totals.restante > 0)
        .sort((a, b) =>
          (a.vencimentoPagamento ?? '9999').localeCompare(b.vencimentoPagamento ?? '9999'),
        ),
    })
  })
  // Lista contas manuais e contas criadas pelos materiais de serviço.
  app.get('/pagar', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const bills = await db.contaPagar.findMany({
      where: { usuarioId: user.id },
      include: { ordemServico: { include: { cliente: true } } },
      orderBy: { vencimento: 'asc' },
    })
    return page(request, reply, 'Payables', {
      user: { nome: user.nome },
      bills: bills.map((bill) => ({
        id: bill.id,
        descricao: bill.descricao,
        categoria: bill.categoria,
        valor: Number(bill.valor),
        vencimento: isoDate(bill.vencimento),
        pagoEm: bill.pagoEm?.toISOString() ?? null,
        materialServicoId: bill.materialServicoId,
        ordemServicoId: bill.ordemServicoId,
        cliente: bill.ordemServico?.cliente.nomeCliente ?? null,
        clienteId: bill.ordemServico?.clienteId ?? null,
      })),
    })
  })
  // Cadastra uma conta independente com vencimento e valor validados.
  app.post('/pagar', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    try {
      const input = body(request)
      const amount = cents(input.valor)
      if (amount <= 0) throw new Error('O valor da conta deve ser maior que zero.')
      await db.contaPagar.create({
        data: {
          usuarioId: user.id,
          descricao: required(input.descricao, 'a descrição da conta'),
          categoria: String(input.categoria ?? '').trim() || null,
          valor: decimal(amount),
          vencimento: dateOnly(required(input.vencimento, 'o vencimento')),
        },
      })
      return redirect(reply, '/pagar', 'sucesso', 'Conta cadastrada.')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Dá baixa na conta e marca o material vinculado como já pago na mesma transação.
  app.post<{ Params: { id: string } }>('/pagar/:id/baixar', async (request, reply) => {
    const user = await auth(request, reply)
    if (!user) return reply
    const updated = await db.$transaction(async (tx) => {
      const bill = await tx.contaPagar.findFirst({
        where: { id: request.params.id, usuarioId: user.id, pagoEm: null },
      })
      if (!bill) return 0
      const result = await tx.contaPagar.updateMany({
        where: { id: bill.id, usuarioId: user.id, pagoEm: null },
        data: { pagoEm: new Date() },
      })
      if (result.count && bill.materialServicoId) {
        await tx.materialServico.update({
          where: { id: bill.materialServicoId },
          data: { jaPago: true },
        })
      }
      return result.count
    })
    return redirect(
      reply,
      '/pagar',
      updated ? 'sucesso' : 'erro',
      updated ? 'Conta marcada como paga.' : 'Conta não encontrada ou já paga.',
    )
  })
}
