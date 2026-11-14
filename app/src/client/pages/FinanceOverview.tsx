import { Link } from '@inertiajs/react'
import type { FinanceTotals } from '../types.js'
import { Layout } from '../components/Layout.js'
import { Card, Empty, SectionHead } from '../components/ui.js'
import { Icon } from '../components/Icon.js'
import { money } from '../lib/format.js'

// Rótulos usados na seleção e no resumo de cada mês do ano.
const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/** Formato do relatório agregado enviado pela rota de finanças. */
type Report = {
  annual: FinanceTotals
  period: FinanceTotals
  byMonth: { month: number; totals: FinanceTotals }[]
  byClient: { client: { id: string; nome: string }; totals: FinanceTotals }[]
  clients: { id: string; nome: string }[]
}

/** Exibe os indicadores do período selecionado em cartões. */
function Metrics({ totals }: { totals: FinanceTotals }) {
  const entries: { label: string; value: number; note: string; icon: string }[] = [
    {
      label: 'Faturado',
      value: totals.faturado,
      note: 'Serviços iniciados no período',
      icon: 'briefcase',
    },
    {
      label: 'Recebido',
      value: totals.recebido,
      note: 'Entradas efetivas no período',
      icon: 'check',
    },
    {
      label: 'A receber',
      value: totals.aReceber,
      note: 'Saldo dos serviços do período',
      icon: 'down',
    },
    {
      label: 'Gastos lançados',
      value: totals.gastos,
      note: 'Itens e contas por vencimento',
      icon: 'up',
    },
    {
      label: 'Lucro estimado',
      value: totals.lucro,
      note: 'Faturado menos gastos lançados',
      icon: 'grid',
    },
    {
      label: 'Saldo de caixa',
      value: totals.saldoCaixa,
      note: 'Recebido menos despesas pagas',
      icon: 'clock',
    },
  ]
  return (
    <div className="finance-metrics">
      {entries.map((entry) => (
        <Card className="metric-card" key={entry.label}>
          <div className="metric-top">
            <span>{entry.label}</span>
            <span className="metric-icon">
              <Icon name={entry.icon} size={19} />
            </span>
          </div>
          <strong>{money(entry.value)}</strong>
          <small>{entry.note}</small>
        </Card>
      ))}
    </div>
  )
}

/** Filtros e detalhamento anual, mensal e por cliente das finanças. */
export function FinanceOverview({
  report,
  filters,
  years,
}: {
  report: Report
  filters: { year: number; month: number | null; clientId: string | null }
  years: number[]
}) {
  const periodName =
    filters.month === null
      ? `ano de ${filters.year}`
      : `${monthNames[filters.month - 1]} de ${filters.year}`
  return (
    <Layout
      title="Finanças"
      subtitle="Acompanhe faturamento, despesas e resultados por período e cliente."
    >
      {/* Filtros enviados por GET para recalcular o relatório no servidor. */}
      <Card className="finance-filter-card">
        <form className="finance-filters" method="get" action="/financas">
          <label>
            Ano
            <select name="ano" defaultValue={filters.year}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mês
            <select name="mes" defaultValue={filters.month ?? 'todos'}>
              <option value="todos">Ano inteiro</option>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cliente
            <select name="clienteId" defaultValue={filters.clientId ?? ''}>
              <option value="">Todos os clientes</option>
              {report.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nome}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Aplicar filtros</button>
        </form>
      </Card>

      {/* Indicadores agregados do ano e do período escolhido. */}
      <section className="finance-section" aria-label="Resumo anual">
        <SectionHead title={`Visão do ano ${filters.year}`} />
        <Metrics totals={report.annual} />
      </section>
      {filters.month !== null && (
        <section className="finance-section" aria-label="Resumo mensal">
          <SectionHead title={`Visão de ${periodName}`} />
          <Metrics totals={report.period} />
        </section>
      )}

      {/* Tabelas para evolução mensal e resultado por cliente. */}
      <div className="finance-tables">
        <Card>
          <SectionHead title="Mês a mês" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MÊS</th>
                  <th>FATURADO</th>
                  <th>RECEBIDO</th>
                  <th>GASTOS</th>
                  <th>LUCRO ESTIMADO</th>
                </tr>
              </thead>
              <tbody>
                {report.byMonth.map(({ month, totals }) => (
                  <tr key={month}>
                    <td>{monthNames[month - 1]}</td>
                    <td>{money(totals.faturado)}</td>
                    <td>{money(totals.recebido)}</td>
                    <td>{money(totals.gastos)}</td>
                    <td className="table-money">{money(totals.lucro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionHead title={`Por cliente · ${periodName}`} />
          {report.byClient.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>FATURADO</th>
                    <th>RECEBIDO</th>
                    <th>GASTOS</th>
                    <th>LUCRO ESTIMADO</th>
                    <th>A RECEBER</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byClient.map(({ client, totals }) => (
                    <tr key={client.id}>
                      <td>
                        <Link href="/clientes" className="table-primary">
                          {client.nome}
                        </Link>
                      </td>
                      <td>{money(totals.faturado)}</td>
                      <td>{money(totals.recebido)}</td>
                      <td>{money(totals.gastos)}</td>
                      <td>{money(totals.lucro)}</td>
                      <td className="table-money">{money(totals.aReceber)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Sem movimentação"
              description="Não há valores para os filtros selecionados."
            />
          )}
        </Card>
      </div>
      <p className="finance-footnote">
        Gastos lançados incluem os custos dos itens e as contas manuais. Contas criadas por itens
        não são somadas novamente. O saldo de caixa considera apenas pagamentos efetivos.
      </p>
    </Layout>
  )
}
