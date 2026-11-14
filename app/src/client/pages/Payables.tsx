import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { Card, Empty, SectionHead } from '../components/ui.js'
import { date, dateTime, money } from '../lib/format.js'
import { post } from '../lib/forms.js'
import type { Bill } from '../types.js'

/** Filtra contas a pagar, permite dar baixa e cadastrar uma nova conta. */
export function Payables({ bills }: { bills: Bill[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [category, setCategory] = useState('')
  const [clientId, setClientId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // As opções de filtro vêm das contas existentes, inclusive materiais vinculados.
  const categories = [
    ...new Set(
      bills.map((bill) => bill.categoria).filter((value): value is string => Boolean(value)),
    ),
  ].sort()
  const clients = [
    ...new Map(
      bills
        .filter((bill) => bill.clienteId)
        .map((bill) => [bill.clienteId, { id: bill.clienteId!, nome: bill.cliente! }]),
    ).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  // Todos os cards e listas seguem o mesmo conjunto filtrado.
  const visible = bills.filter(
    (item) =>
      (status === 'TODOS' || (status === 'PENDENTE' ? !item.pagoEm : Boolean(item.pagoEm))) &&
      (!category || item.categoria === category) &&
      (!clientId || (clientId === 'manual' ? !item.clienteId : item.clienteId === clientId)) &&
      (!from || item.vencimento >= from) &&
      (!to || item.vencimento <= to) &&
      `${item.descricao} ${item.categoria ?? ''} ${item.cliente ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const open = visible.filter((item) => !item.pagoEm),
    paid = visible.filter((item) => item.pagoEm)
  return (
    <Layout title="A pagar" subtitle="Organize suas despesas e marque o que já foi pago.">
      <div className="split-page">
        <div className="stack">
          <Card>
            <div className="list-filters">
              <label>
                Buscar
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Descrição ou cliente"
                />
              </label>
              <label>
                Situação
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="TODOS">Todas</option>
                  <option value="PENDENTE">Pendentes</option>
                  <option value="PAGO">Pagas</option>
                </select>
              </label>
              <label>
                Categoria
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Todas</option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cliente
                <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                  <option value="">Todos</option>
                  <option value="manual">Sem cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vencimento de
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
                  setStatus('TODOS')
                  setCategory('')
                  setClientId('')
                  setFrom('')
                  setTo('')
                }}
              >
                Limpar filtros
              </button>
            </div>
            <p className="filter-count">
              {visible.length} de {bills.length} contas
            </p>
          </Card>
          {/* Contas pendentes, incluindo materiais ainda não pagos. */}
          {status !== 'PAGO' && (
            <Card>
              <SectionHead title="Em aberto" />
              {open.length ? (
                <div className="list">
                  {open.map((item) => (
                    <div className="list-row" key={item.id}>
                      <span className="bill-icon">
                        <Icon name="up" size={19} />
                      </span>
                      <span className="row-content">
                        <strong>{item.descricao}</strong>
                        <small>
                          {item.cliente ? `${item.cliente} · ` : ''}
                          {item.categoria ? `${item.categoria} · ` : ''}Vence em{' '}
                          {date(item.vencimento)}
                        </small>
                      </span>
                      <strong className="row-value">{money(item.valor)}</strong>
                      <button
                        className="icon-button"
                        title="Marcar como pago"
                        onClick={() => router.post(`/pagar/${item.id}/baixar`)}
                      >
                        <Icon name="check" size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Nenhuma conta em aberto"
                  description="Não há contas pendentes para os filtros selecionados."
                />
              )}
            </Card>
          )}
          {/* Histórico de contas já baixadas. */}
          {status !== 'PENDENTE' && (
            <Card>
              <SectionHead title="Pagas" />
              {paid.length ? (
                <div className="list">
                  {paid.map((item) => (
                    <div className="list-row faded" key={item.id}>
                      <span className="bill-icon muted">
                        <Icon name="check" size={19} />
                      </span>
                      <span className="row-content">
                        <strong>{item.descricao}</strong>
                        <small>
                          {item.cliente ? `${item.cliente} · ` : ''}Pago em {dateTime(item.pagoEm)}
                        </small>
                      </span>
                      <strong className="row-value">{money(item.valor)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Nenhuma conta paga"
                  description="Não há contas pagas para os filtros selecionados."
                />
              )}
            </Card>
          )}
        </div>
        {/* Cadastro manual de uma despesa sem vínculo obrigatório com serviço. */}
        <Card className="form-card">
          <h2>Nova conta</h2>
          <p>Registre uma despesa para acompanhar o vencimento.</p>
          <form className="stack" onSubmit={(event) => post(event, '/pagar')}>
            <label>
              Descrição
              <input name="descricao" placeholder="Ex.: Aluguel da oficina" required />
            </label>
            <label>
              Categoria
              <input name="categoria" placeholder="Ex.: Fixas, materiais" />
            </label>
            <label>
              Valor (R$)
              <input
                type="number"
                name="valor"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                required
              />
            </label>
            <label>
              Vencimento
              <input type="date" name="vencimento" required />
            </label>
            <button className="button button-full">
              <Icon name="plus" size={17} /> Adicionar conta
            </button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
