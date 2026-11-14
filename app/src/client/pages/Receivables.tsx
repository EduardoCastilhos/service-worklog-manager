import { useState } from 'react'
import { Link } from '@inertiajs/react'
import type { Order } from '../types.js'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { ButtonLink, Card, Empty, SectionHead } from '../components/ui.js'
import { date, money, today } from '../lib/format.js'

/** Campos mínimos necessários aos filtros e indicadores gerais. */
type SummaryOrder = Pick<Order, 'nomeServico' | 'cliente' | 'vencimentoPagamento' | 'totals'>

/** Mostra saldos em aberto e totais recebidos ou faturados por filtro. */
export function Receivables({
  orders,
  totalRecebido,
  totalGeral,
  summaryOrders,
}: {
  orders: Order[]
  totalRecebido: number
  totalGeral: number
  summaryOrders: SummaryOrder[]
}) {
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [deadline, setDeadline] = useState('TODOS')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const clients = [
    ...new Map(summaryOrders.map((order) => [order.cliente.id, order.cliente])).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const currentDate = today()
  // Reaplica a mesma regra à lista em aberto e ao conjunto usado nos totais.
  const matches = (item: SummaryOrder) =>
    (!clientId || item.cliente.id === clientId) &&
    (!from || (item.vencimentoPagamento ?? '') >= from) &&
    (!to || (item.vencimentoPagamento ?? '') <= to) &&
    (deadline === 'TODOS' ||
      (deadline === 'ATRASADO' &&
        item.totals.restante > 0 &&
        Boolean(item.vencimentoPagamento && item.vencimentoPagamento < currentDate)) ||
      (deadline === 'A_VENCER' &&
        item.totals.restante > 0 &&
        Boolean(item.vencimentoPagamento && item.vencimentoPagamento >= currentDate)) ||
      (deadline === 'SEM_DATA' && item.totals.restante > 0 && !item.vencimentoPagamento)) &&
    `${item.nomeServico} ${item.cliente.nome}`.toLowerCase().includes(search.toLowerCase())
  const visible = orders.filter(matches)
  const filteredSummary = summaryOrders.filter(matches)
  const filtersActive = Boolean(search || clientId || from || to || deadline !== 'TODOS')
  const total = visible.reduce((sum, item) => sum + item.totals.restante, 0)
  const received = filtersActive
    ? filteredSummary.reduce((sum, item) => sum + item.totals.recebido, 0)
    : totalRecebido
  const general = filtersActive
    ? filteredSummary.reduce((sum, item) => sum + item.totals.total, 0)
    : totalGeral
  return (
    <Layout
      title="A receber"
      subtitle="Saldos pendentes dos serviços registrados."
      action={
        <ButtonLink href="/servicos/novo">
          <Icon name="plus" size={18} /> Novo serviço
        </ButtonLink>
      }
    >
      {/* Restringe a lista e os totais pelo mesmo conjunto de filtros. */}
      <Card className="receivables-filter-card">
        <div className="list-filters">
          <label>
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Serviço ou cliente"
            />
          </label>
          <label>
            Cliente
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Todos</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vencimento
            <select value={deadline} onChange={(event) => setDeadline(event.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="ATRASADO">Atrasados</option>
              <option value="A_VENCER">A vencer</option>
              <option value="SEM_DATA">Sem data</option>
            </select>
          </label>
          <label>
            De
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            Até
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="button filter-reset"
            onClick={() => {
              setSearch('')
              setClientId('')
              setDeadline('TODOS')
              setFrom('')
              setTo('')
            }}
          >
            Limpar filtros
          </button>
        </div>
        <p className="filter-count">
          {visible.length} de {orders.length} serviços pendentes
        </p>
      </Card>
      {/* Compara saldo em aberto, valor recebido e faturamento geral. */}
      <div className="receivables-metrics">
        <Card className="metric-card featured">
          <div className="metric-top">
            <span>Total a receber</span>
            <span className="metric-icon">
              <Icon name="down" size={19} />
            </span>
          </div>
          <strong>{money(total)}</strong>
          <small>
            {visible.length}{' '}
            {visible.length === 1 ? 'serviço com saldo pendente' : 'serviços com saldo pendente'}
          </small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Total recebido</span>
            <span className="metric-icon">
              <Icon name="check" size={19} />
            </span>
          </div>
          <strong>{money(received)}</strong>
          <small>Recebimentos registrados em todos os serviços</small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Total geral</span>
            <span className="metric-icon">
              <Icon name="briefcase" size={19} />
            </span>
          </div>
          <strong>{money(general)}</strong>
          <small>Valor total dos serviços registrados</small>
        </Card>
      </div>
      {/* Exibe somente ordens com saldo a receber. */}
      <Card>
        <SectionHead title="Recebimentos pendentes" />
        {visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SERVIÇO</th>
                  <th>CLIENTE</th>
                  <th>VENCIMENTO</th>
                  <th>RECEBIDO</th>
                  <th>SALDO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/servicos/${item.id}`} className="table-primary">
                        {item.nomeServico}
                      </Link>
                    </td>
                    <td>{item.cliente.nome}</td>
                    <td>{date(item.vencimentoPagamento)}</td>
                    <td>{money(item.totals.recebido)}</td>
                    <td className="table-money">{money(item.totals.restante)}</td>
                    <td>
                      <Link
                        href={`/servicos/${item.id}`}
                        className="open-link"
                        title="Registrar recebimento"
                      >
                        <Icon name="arrow" size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nada pendente"
            description={
              orders.length
                ? 'Tente outros filtros.'
                : 'Quando houver serviços com saldo a receber, eles aparecerão aqui.'
            }
          />
        )}
      </Card>
    </Layout>
  )
}
