import type { Rates } from '../types.js'
import { Icon } from './Icon.js'
import { money, today } from '../lib/format.js'

/** Campos editáveis de um material ou outra despesa da etapa. */
export type ItemDraft = {
  tipo: string
  nome: string
  descricao: string
  quantidade: string
  valorGasto: string
  valorCobrado: string
  jaPago: boolean
  vencimento: string
}
/** Estado do formulário de uma etapa antes da conversão para a rota. */
export type RecordDraft = {
  nomeRegistro: string
  descricaoRegistro: string
  data: string
  horas: string
  deslocamentos: string
  descontoRegistro: string
  acrescimoRegistro: string
  itens: ItemDraft[]
}
/** Cria um item vazio com os valores iniciais esperados pelos controles. */
const newItem = (): ItemDraft => ({
  tipo: 'MATERIAL',
  nome: '',
  descricao: '',
  quantidade: '1',
  valorGasto: '0',
  valorCobrado: '0',
  jaPago: false,
  vencimento: '',
})
/** Reinicia a etapa e preenche a data atual para o próximo registro. */
export const newRecord = (name = ''): RecordDraft => ({
  nomeRegistro: name,
  descricaoRegistro: '',
  data: today(),
  horas: '0',
  deslocamentos: '0',
  descontoRegistro: '0',
  acrescimoRegistro: '0',
  itens: [],
})
/** Edita horas, deslocamentos, itens e ajustes de uma etapa de serviço. */
export function RecordEditor({
  value,
  onChange,
  rates,
}: {
  value: RecordDraft
  onChange: (next: RecordDraft) => void
  rates: Rates
}) {
  const set = <Key extends keyof RecordDraft>(key: Key, next: RecordDraft[Key]) =>
    onChange({ ...value, [key]: next })
  // A prévia usa as tarifas do perfil; o servidor recalcula antes de persistir.
  const itemTotal = value.itens.reduce(
    (sum, item) => sum + Number(item.quantidade || 0) * Number(item.valorCobrado || 0),
    0,
  )
  const estimate = Math.max(
    0,
    Number(value.horas || 0) * rates.valorHora +
      Number(value.deslocamentos || 0) * rates.valorDeslocamento +
      itemTotal -
      Number(value.descontoRegistro || 0) +
      Number(value.acrescimoRegistro || 0),
  )
  // Atualiza somente o item alterado, preservando a imutabilidade do estado React.
  const updateItem = <Key extends keyof ItemDraft>(index: number, key: Key, next: ItemDraft[Key]) =>
    set(
      'itens',
      value.itens.map((item, position) => (position === index ? { ...item, [key]: next } : item)),
    )
  return (
    <>
      {/* Identificação e duração da etapa de trabalho. */}
      <div className="field-grid">
        <label>
          Nome desta etapa
          <input
            value={value.nomeRegistro}
            onChange={(event) => set('nomeRegistro', event.target.value)}
            placeholder="Ex.: Ajuste e regulagem"
            required
          />
        </label>
        <label>
          Data do trabalho
          <input
            type="date"
            value={value.data}
            onChange={(event) => set('data', event.target.value)}
            required
          />
        </label>
      </div>
      <label>
        Descrição do que foi feito
        <textarea
          value={value.descricaoRegistro}
          onChange={(event) => set('descricaoRegistro', event.target.value)}
          placeholder="Detalhes do serviço realizado"
          rows={3}
        />
      </label>
      <div className="field-grid">
        <label>
          Horas trabalhadas
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.horas}
            onChange={(event) => set('horas', event.target.value)}
            required
          />
        </label>
        <label>
          Deslocamentos
          <input
            type="number"
            min="0"
            step="1"
            value={value.deslocamentos}
            onChange={(event) => set('deslocamentos', event.target.value)}
            required
          />
        </label>
      </div>
      <div className="rate-note">
        Cálculo automático: {money(rates.valorHora)}/hora e {money(rates.valorDeslocamento)}
        /deslocamento
      </div>
      {/* Os itens podem gerar contas a pagar quando ainda não foram pagos. */}
      <div className="subsection-head">
        <div>
          <h3>Gastos e itens</h3>
          <p>Registre o custo real e o valor cobrado de cada item.</p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => set('itens', [...value.itens, newItem()])}
        >
          <Icon name="plus" size={17} /> Adicionar item
        </button>
      </div>
      {value.itens.map((item, index) => (
        <div className="item-editor" key={index}>
          <div className="field-grid">
            <label>
              Tipo
              <select
                value={item.tipo}
                onChange={(event) => updateItem(index, 'tipo', event.target.value)}
              >
                <option value="MATERIAL">Material</option>
                <option value="SERVICO_TERCEIRIZADO">Serviço terceirizado</option>
                <option value="OUTRA_DESPESA">Outra despesa</option>
              </select>
            </label>
            <label>
              Nome do item
              <input
                value={item.nome}
                onChange={(event) => updateItem(index, 'nome', event.target.value)}
                placeholder="Ex.: Correia"
                required
              />
            </label>
          </div>
          <label>
            Descrição
            <input
              value={item.descricao}
              onChange={(event) => updateItem(index, 'descricao', event.target.value)}
              placeholder="Opcional"
            />
          </label>
          <div className="field-grid three">
            <label>
              Quantidade
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={item.quantidade}
                onChange={(event) => updateItem(index, 'quantidade', event.target.value)}
              />
            </label>
            <label>
              Custo por unidade (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.valorGasto}
                onChange={(event) => updateItem(index, 'valorGasto', event.target.value)}
              />
            </label>
            <label>
              Cobrado por unidade (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.valorCobrado}
                onChange={(event) => updateItem(index, 'valorCobrado', event.target.value)}
              />
            </label>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={item.jaPago}
              onChange={(event) => updateItem(index, 'jaPago', event.target.checked)}
            />
            <span>
              <strong>Já pago</strong>
              <small>Itens com custo e sem esta marcação entram em A pagar.</small>
            </span>
          </label>
          {!item.jaPago && Number(item.valorGasto) > 0 && (
            <label>
              Vencimento da compra (opcional)
              <input
                type="date"
                value={item.vencimento}
                onChange={(event) => updateItem(index, 'vencimento', event.target.value)}
              />
              <small>Se ficar em branco, será usada a data do trabalho.</small>
            </label>
          )}
          <button
            type="button"
            className="remove-button"
            onClick={() =>
              set(
                'itens',
                value.itens.filter((_, position) => position !== index),
              )
            }
          >
            Remover item
          </button>
        </div>
      ))}
      <div className="field-grid">
        <label>
          Desconto desta etapa (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.descontoRegistro}
            onChange={(event) => set('descontoRegistro', event.target.value)}
          />
        </label>
        <label>
          Acréscimo desta etapa (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.acrescimoRegistro}
            onChange={(event) => set('acrescimoRegistro', event.target.value)}
          />
        </label>
      </div>
      {/* Prévia informativa do total; a gravação usa o cálculo do servidor. */}
      <div className="estimate">
        <span>Estimativa desta etapa</span>
        <strong>{money(estimate)}</strong>
      </div>
    </>
  )
}
/** Converte o rascunho React no corpo esperado pelas rotas de serviço. */
export function recordPayload(record: RecordDraft) {
  return { ...record, minutos: Math.round(Number(record.horas) * 60), itens: record.itens }
}
