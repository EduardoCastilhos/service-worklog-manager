import { toCents } from '../domain.js'
import type { ordersFor } from './orders.js'

// O relatório usa o mesmo contrato de ordens entregue às páginas.
type Order = Awaited<ReturnType<typeof ordersFor>>[number]
/** Campos de uma conta necessários à apuração financeira. */
export type FinanceBill = {
  id: string
  ordemServicoId: string | null
  materialServicoId: string | null
  valor: number
  vencimento: string
  pagoEm: string | null
}

/** Indicadores somados por período e por cliente. */
export type FinanceTotals = {
  faturado: number
  recebido: number
  aReceber: number
  gastos: number
  despesasPagas: number
  lucro: number
  saldoCaixa: number
}

/** Converte o resultado final dos cálculos em centavos para reais. */
const reais = (centavos: number) => centavos / 100

/** Consolida faturamento, recebimentos e gastos por ano, mês e cliente. */
export function buildFinanceReport(
  orders: Order[],
  bills: FinanceBill[],
  year: number,
  month: number | null,
  clientId: string | null,
  timeZone: string,
) {
  const orderById = new Map(orders.map((order) => [order.id, order]))
  const linkedMaterials = new Set(
    bills.flatMap((bill) => (bill.materialServicoId ? [bill.materialServicoId] : [])),
  )
  // Instantes de pagamento seguem o fuso do usuário; datas de calendário não mudam de dia.
  const dateParts = (value: string) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date(value))
    return {
      year: Number(parts.find((part) => part.type === 'year')?.value),
      month: Number(parts.find((part) => part.type === 'month')?.value),
    }
  }
  const inPeriod = (value: string, selectedMonth: number | null, instant = false) => {
    const date = instant
      ? dateParts(value)
      : { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) }
    return date.year === year && (selectedMonth === null || date.month === selectedMonth)
  }
  const forClient = (orderId: string | null, selectedClient: string | null) =>
    selectedClient === null ||
    (orderId !== null && orderById.get(orderId)?.cliente.id === selectedClient)

  // Evita contar a despesa de material duas vezes quando ela também gerou conta a pagar.
  function totals(selectedMonth: number | null, selectedClient: string | null): FinanceTotals {
    let faturado = 0,
      recebido = 0,
      aReceber = 0,
      gastos = 0,
      despesasPagas = 0
    for (const order of orders) {
      if (!forClient(order.id, selectedClient)) continue
      if (inPeriod(order.comecoServico, selectedMonth)) {
        faturado += toCents(order.totals.total)
        aReceber += toCents(order.totals.restante)
      }
      for (const payment of order.pagamentos) {
        if (inPeriod(payment.pagoEm, selectedMonth, true)) recebido += toCents(payment.valor)
      }
      for (const record of order.registros) {
        if (!record.data || !inPeriod(record.data, selectedMonth)) continue
        for (const item of record.itens) {
          const cost = Math.round(item.quantidade * toCents(item.valorGasto))
          gastos += cost
          if (item.jaPago && !linkedMaterials.has(item.id)) despesasPagas += cost
        }
        gastos += toCents(record.custoDeslocamento)
      }
    }
    for (const bill of bills) {
      if (!forClient(bill.ordemServicoId, selectedClient)) continue
      if (!bill.materialServicoId && inPeriod(bill.vencimento, selectedMonth))
        gastos += toCents(bill.valor)
      if (bill.pagoEm && inPeriod(bill.pagoEm, selectedMonth, true))
        despesasPagas += toCents(bill.valor)
    }
    return {
      faturado: reais(faturado),
      recebido: reais(recebido),
      aReceber: reais(aReceber),
      gastos: reais(gastos),
      despesasPagas: reais(despesasPagas),
      lucro: reais(faturado - gastos),
      saldoCaixa: reais(recebido - despesasPagas),
    }
  }

  // Reaproveita o cálculo para os cartões anuais, o detalhamento mensal e o recorte por cliente.
  const clients = [
    ...new Map(orders.map((order) => [order.cliente.id, order.cliente])).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const byClient = clients
    .filter((client) => clientId === null || client.id === clientId)
    .map((client) => ({ client, totals: totals(month, client.id) }))
    .filter(({ totals: value }) => Object.values(value).some((amount) => amount !== 0))
  const byMonth = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    totals: totals(index + 1, clientId),
  }))
  return {
    annual: totals(null, clientId),
    period: totals(month, clientId),
    byMonth,
    byClient,
    clients,
  }
}
