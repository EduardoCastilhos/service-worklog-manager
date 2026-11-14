import { useState } from 'react'
import { Link } from '@inertiajs/react'
import type { Order } from '../types.js'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { ButtonLink, Card, Empty, Status } from '../components/ui.js'
import { date, money } from '../lib/format.js'

/** Apresenta o histórico de serviços com filtros de situação, cliente e período. */
export function Services({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState('TODOS')
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const clients = [
    ...new Map(orders.map((order) => [order.cliente.id, order.cliente])).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  // A lista e a contagem exibidas usam o mesmo resultado filtrado.
  const visible = orders.filter(
    (item) =>
      (filter === 'TODOS' || item.situacao === filter) &&
      (!clientId || item.cliente.id === clientId) &&
      (!from || item.comecoServico.slice(0, 10) >= from) &&
      (!to || item.comecoServico.slice(0, 10) <= to) &&
      `${item.nomeServico} ${item.cliente.nome}`.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <Layout
      title="Serviços"
      subtitle="Acompanhe cada trabalho, suas etapas e seus valores."
      action={
        <ButtonLink href="/servicos/novo">
          <Icon name="plus" size={18} /> Novo serviço
        </ButtonLink>
      }
    >
      {/* Filtros locais e tabela de ordens retornadas pelo servidor. */}
      <Card>
        <div className="toolbar">
          <div className="tabs">
            {[
              ['TODOS', 'Todos'],
              ['EM_ANDAMENTO', 'Em andamento'],
              ['CONCLUIDO', 'Concluídos'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? 'selected' : ''}
                onClick={() => setFilter(value ?? '')}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="search"
            placeholder="Buscar serviço ou cliente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="list-filters">
          <label>
            Cliente
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            De <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            Até{' '}
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
              setFilter('TODOS')
              setSearch('')
              setClientId('')
              setFrom('')
              setTo('')
            }}
          >
            Limpar filtros
          </button>
        </div>
        <p className="filter-count">
          {visible.length} de {orders.length} serviços
        </p>
        {visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SERVIÇO</th>
                  <th>CLIENTE</th>
                  <th>DATA</th>
                  <th>ETAPAS</th>
                  <th>SITUAÇÃO</th>
                  <th>TOTAL</th>
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
                      <small>{item.descricao || 'Sem descrição'}</small>
                    </td>
                    <td>{item.cliente.nome}</td>
                    <td>{date(item.comecoServico)}</td>
                    <td>{item.registros.length}</td>
                    <td>
                      <Status value={item.situacao} />
                    </td>
                    <td className="table-money">{money(item.totals.total)}</td>
                    <td>
                      <Link href={`/servicos/${item.id}`} className="open-link">
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
            title="Nenhum serviço encontrado"
            description={
              orders.length
                ? 'Tente outro termo ou filtro.'
                : 'Registre seu primeiro trabalho para começar.'
            }
            href={orders.length ? undefined : '/servicos/novo'}
            action="Novo serviço"
          />
        )}
      </Card>
    </Layout>
  )
}
