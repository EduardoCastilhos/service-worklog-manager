import { useState } from 'react'
import { router } from '@inertiajs/react'
import type { Order, Rates } from '../types.js'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { ButtonLink, Card, Status } from '../components/ui.js'
import { RecordEditor, newRecord, recordPayload } from '../components/RecordEditor.js'
import { date, dateTime, money } from '../lib/format.js'
import { hasFlashError, post } from '../lib/forms.js'

/** Exibe etapas, totais e pagamentos de uma ordem e permite sua continuidade. */
export function ServiceDetail({ order, rates }: { order: Order; rates: Rates }) {
  const [record, setRecord] = useState(newRecord(order.nomeServico))
  const [adding, setAdding] = useState(false)
  const [recordSearch, setRecordSearch] = useState('')
  const [recordFrom, setRecordFrom] = useState('')
  const [recordTo, setRecordTo] = useState('')
  // Restringe as etapas por texto e intervalo de datas sem alterar a ordem original.
  const visibleRecords = order.registros.filter(
    (item) =>
      (!recordFrom || (item.data ?? '') >= recordFrom) &&
      (!recordTo || (item.data ?? '') <= recordTo) &&
      `${item.nome} ${item.descricao} ${item.itens.map((material) => material.nome).join(' ')}`
        .toLowerCase()
        .includes(recordSearch.toLowerCase()),
  )
  return (
    <Layout
      title={order.nomeServico}
      subtitle={`${order.cliente.nome} · Iniciado em ${date(order.comecoServico)}`}
      action={
        <ButtonLink href="/servicos" secondary>
          Voltar aos serviços
        </ButtonLink>
      }
    >
      <div className="detail-head">
        <Status value={order.situacao} />
        <span>
          {order.registros.length}{' '}
          {order.registros.length === 1 ? 'etapa registrada' : 'etapas registradas'}
        </span>
        <div className="detail-actions">
          {order.situacao === 'CONCLUIDO' ? (
            <button
              className="button secondary small"
              onClick={() => router.post(`/servicos/${order.id}/reabrir`)}
            >
              Reabrir serviço
            </button>
          ) : (
            <button
              className="button secondary small"
              onClick={() => router.post(`/servicos/${order.id}/concluir`)}
            >
              <Icon name="check" size={16} /> Concluir serviço
            </button>
          )}
        </div>
      </div>
      {/* Totais da ordem calculados a partir das etapas e dos recebimentos. */}
      <div className="metric-grid">
        <Card className="metric-card featured">
          <div className="metric-top">
            <span>Valor total cobrado</span>
            <span className="metric-icon">
              <Icon name="briefcase" size={19} />
            </span>
          </div>
          <strong>{money(order.totals.total)}</strong>
          <small>Soma das etapas e ajustes</small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Já recebido</span>
            <span className="metric-icon">
              <Icon name="check" size={19} />
            </span>
          </div>
          <strong>{money(order.totals.recebido)}</strong>
          <small>Pagamentos registrados</small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Saldo a receber</span>
            <span className="metric-icon">
              <Icon name="down" size={19} />
            </span>
          </div>
          <strong>{money(order.totals.restante)}</strong>
          <small>
            {order.vencimentoPagamento
              ? `Vence em ${date(order.vencimentoPagamento)}`
              : 'Sem vencimento definido'}
          </small>
        </Card>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          {/* Histórico das etapas, com filtros de texto e data. */}
          <Card>
            <div className="section-head">
              <div>
                <h2>Etapas do serviço</h2>
                <p>Cada atendimento e seus respectivos valores.</p>
              </div>
              {order.situacao !== 'CONCLUIDO' && (
                <button className="button small" onClick={() => setAdding(!adding)}>
                  <Icon name="plus" size={17} /> Nova etapa
                </button>
              )}
            </div>
            <div className="list-filters record-filters">
              <label>
                Buscar etapa
                <input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Nome, descrição ou item"
                />
              </label>
              <label>
                De
                <input
                  type="date"
                  value={recordFrom}
                  onChange={(event) => setRecordFrom(event.target.value)}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  value={recordTo}
                  min={recordFrom || undefined}
                  onChange={(event) => setRecordTo(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="button filter-reset"
                onClick={() => {
                  setRecordSearch('')
                  setRecordFrom('')
                  setRecordTo('')
                }}
              >
                Limpar filtros
              </button>
            </div>
            <p className="filter-count">
              {visibleRecords.length} de {order.registros.length} etapas
            </p>
            {visibleRecords.length === 0 && (
              <p className="muted-text">Nenhuma etapa para estes filtros.</p>
            )}
            {visibleRecords.map((item) => (
              <div className="record-card" key={item.id}>
                <div className="record-index">
                  {String(order.registros.indexOf(item) + 1).padStart(2, '0')}
                </div>
                <div className="record-content">
                  <div className="record-top">
                    <div>
                      <strong>{item.nome}</strong>
                      <small>
                        {date(item.data)} ·{' '}
                        {(item.minutos / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}{' '}
                        h · {item.deslocamentos} deslocamento(s)
                      </small>
                    </div>
                    <strong className="record-amount">{money(item.totals.total)}</strong>
                  </div>
                  {item.descricao && <p>{item.descricao}</p>}
                  <div className="record-breakdown">
                    <span>
                      Mão de obra <strong>{money(item.totals.maoDeObra)}</strong>
                    </span>
                    <span>
                      Deslocamento <strong>{money(item.totals.deslocamento)}</strong>
                    </span>
                    <span>
                      Itens cobrados <strong>{money(item.totals.itensCobrados)}</strong>
                    </span>
                    <span>
                      Gastos reais <strong>{money(item.totals.gastos)}</strong>
                    </span>
                  </div>
                  {item.itens.length > 0 && (
                    <div className="item-list">
                      {item.itens.map((material) => (
                        <div key={material.id}>
                          <span>
                            {material.nome} <small>× {material.quantidade}</small>
                          </span>
                          <span>
                            Custo {money(material.valorGasto)} · Cobrado{' '}
                            {money(material.valorCobrado)} ·{' '}
                            {material.valorGasto === 0
                              ? 'Sem custo'
                              : material.jaPago === null
                                ? 'Pagamento não informado'
                                : material.jaPago
                                  ? 'Já pago'
                                  : 'A pagar'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card>
          {/* Uma nova etapa só pode ser enviada enquanto a ordem está aberta. */}
          {adding && order.situacao !== 'CONCLUIDO' && (
            <Card>
              <div className="section-head">
                <h2>Adicionar etapa</h2>
              </div>
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault()
                  router.post(`/servicos/${order.id}/registros`, recordPayload(record), {
                    onSuccess: (page: { props: unknown }) => {
                      if (!hasFlashError(page.props)) {
                        setRecord(newRecord(order.nomeServico))
                        setAdding(false)
                      }
                    },
                  })
                }}
              >
                <RecordEditor value={record} onChange={setRecord} rates={rates} />
                <div className="form-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setAdding(false)}
                  >
                    Cancelar
                  </button>
                  <button className="button">
                    Salvar etapa <Icon name="arrow" size={17} />
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>
        <div className="detail-side">
          {/* Detalha a formação do total e o saldo ainda não recebido. */}
          <Card>
            <h2>Resumo financeiro</h2>
            <div className="summary-lines">
              <div>
                <span>Mão de obra</span>
                <strong>{money(order.totals.maoDeObra)}</strong>
              </div>
              <div>
                <span>Deslocamentos</span>
                <strong>{money(order.totals.deslocamento)}</strong>
              </div>
              <div>
                <span>Itens cobrados</span>
                <strong>{money(order.totals.itensCobrados)}</strong>
              </div>
              <div>
                <span>Gastos reais</span>
                <strong>{money(order.totals.gastos)}</strong>
              </div>
              <div className="total">
                <span>Total cobrado</span>
                <strong>{money(order.totals.total)}</strong>
              </div>
            </div>
          </Card>
          {/* Lista pagamentos já lançados e registra a próxima entrada. */}
          <Card>
            <h2>Recebimentos</h2>
            {order.pagamentos.length ? (
              <div className="payment-list">
                {order.pagamentos.map((item) => (
                  <div key={item.id}>
                    <span>
                      <strong>{money(item.valor)}</strong>
                      <small>
                        {dateTime(item.pagoEm)} · {item.forma.replaceAll('_', ' ')}
                      </small>
                    </span>
                    <Icon name="check" size={17} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">Nenhum pagamento registrado.</p>
            )}
            {order.totals.restante > 0 && (
              <form
                className="stack payment-form"
                onSubmit={(event) => post(event, `/servicos/${order.id}/receber`)}
              >
                <label>
                  Valor recebido (R$)
                  <input
                    type="number"
                    name="valor"
                    min="0.01"
                    step="0.01"
                    max={order.totals.restante}
                    placeholder="Informe o valor recebido"
                    required
                  />
                </label>
                <label>
                  Forma de pagamento
                  <select name="forma">
                    <option value="PIX">Pix</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="CARTAO_DEBITO">Cartão de débito</option>
                    <option value="CARTAO_CREDITO">Cartão de crédito</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>
                <button className="button button-full">
                  <Icon name="check" size={17} /> Registrar recebimento
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}
