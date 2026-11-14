import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import type { PageData, Rates } from '../types.js'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { ButtonLink } from '../components/ui.js'
import { RecordEditor, newRecord, recordPayload } from '../components/RecordEditor.js'
import { hasFlashError, post } from '../lib/forms.js'

/** Estado inicial dos dados gerais e dos ajustes da nova ordem. */
const emptyService = () => ({
  clienteId: '',
  nomeServico: '',
  descricao: '',
  vencimento: '',
  desconto: '0',
  acrescimo: '0',
  continuar: false,
})

/** Coordena as três etapas do cadastro e solicita tarifas ausentes em um modal. */
export function NewService({
  clients,
  rates,
  ratesConfigured,
}: {
  clients: { id: string; nome: string }[]
  rates: Rates
  ratesConfigured: boolean
}) {
  // Mantém a etapa de trabalho separada dos dados e ajustes da ordem.
  const [record, setRecord] = useState(newRecord())
  const [form, setForm] = useState(emptyService)
  const [ratesDialogOpen, setRatesDialogOpen] = useState(!ratesConfigured && clients.length > 0)
  const { flash } = usePage<PageData>().props
  const set = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) =>
    setForm({ ...form, [key]: value })
  return (
    <Layout title="Novo serviço" subtitle="Registre o trabalho e deixe os valores por nossa conta.">
      <div className="form-layout">
        <form
          className="service-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!ratesConfigured) {
              setRatesDialogOpen(true)
              return
            }
            // Limpa ambos os rascunhos somente quando a gravação foi concluída.
            router.post(
              '/servicos',
              {
                ...form,
                ...recordPayload(record),
                nomeServico: form.nomeServico,
              },
              {
                onSuccess: (page: { props: unknown }) => {
                  if (!hasFlashError(page.props)) {
                    setForm(emptyService())
                    setRecord(newRecord())
                  }
                },
              },
            )
          }}
        >
          {/* Dados contratuais e cliente da ordem. */}
          <section className="card service-form-section" aria-labelledby="service-step-1">
            <div className="form-section-title">
              <span>01</span>
              <div>
                <h2 id="service-step-1">Dados do serviço</h2>
                <p>As informações principais do trabalho.</p>
              </div>
            </div>
            {clients.length ? (
              <label>
                Cliente
                <select
                  value={form.clienteId}
                  onChange={(event) => set('clienteId', event.target.value)}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="notice info">
                Cadastre um cliente antes de registrar o serviço.{' '}
                <Link href="/clientes">Ir para clientes</Link>
              </div>
            )}
            <label>
              Nome do serviço
              <input
                value={form.nomeServico}
                onChange={(event) => {
                  set('nomeServico', event.target.value)
                  if (!record.nomeRegistro)
                    setRecord({ ...record, nomeRegistro: event.target.value })
                }}
                placeholder="Ex.: Manutenção da máquina de costura"
                required
              />
            </label>
            <label>
              Descrição geral
              <textarea
                value={form.descricao}
                onChange={(event) => set('descricao', event.target.value)}
                rows={3}
                placeholder="Resumo do trabalho combinado"
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.continuar}
                onChange={(event) => set('continuar', event.target.checked)}
              />
              <span>
                <strong>O serviço terá continuidade</strong>
                <small>Você poderá adicionar novas etapas depois.</small>
              </span>
            </label>
          </section>
          {/* Horas, deslocamentos e itens da primeira etapa. */}
          <section className="card service-form-section" aria-labelledby="service-step-2">
            <div className="form-section-title">
              <span>02</span>
              <div>
                <h2 id="service-step-2">Primeira etapa</h2>
                <p>O que foi feito neste atendimento.</p>
              </div>
            </div>
            <div className="service-form-section-body">
              <RecordEditor value={record} onChange={setRecord} rates={rates} />
            </div>
          </section>
          {/* Vencimento e ajustes aplicados ao total da ordem. */}
          <section className="card service-form-section" aria-labelledby="service-step-3">
            <div className="form-section-title">
              <span>03</span>
              <div>
                <h2 id="service-step-3">Ajustes no total</h2>
                <p>Descontos ou acréscimos para o serviço inteiro.</p>
              </div>
            </div>
            <div className="field-grid three">
              <label>
                Vencimento do pagamento
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(event) => set('vencimento', event.target.value)}
                />
              </label>
              <label>
                Desconto geral (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.desconto}
                  onChange={(event) => set('desconto', event.target.value)}
                />
              </label>
              <label>
                Acréscimo geral (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.acrescimo}
                  onChange={(event) => set('acrescimo', event.target.value)}
                />
              </label>
            </div>
          </section>
          <div className="form-actions">
            <ButtonLink href="/servicos" secondary>
              Cancelar
            </ButtonLink>
            <button className="button" disabled={!clients.length}>
              Salvar serviço <Icon name="arrow" size={17} />
            </button>
          </div>
        </form>
        <div className="side-help">
          <div className="help-symbol">
            <Icon name="briefcase" size={25} />
          </div>
          <h3>Um serviço, várias etapas.</h3>
          <p>
            Se o trabalho continuar em outro dia, cada novo registro terá suas próprias horas,
            deslocamentos e gastos. O total é atualizado automaticamente.
          </p>
        </div>
      </div>
      {/* Impede o primeiro registro antes de configurar as tarifas de cálculo. */}
      {ratesDialogOpen && !ratesConfigured && (
        <div className="rates-modal-backdrop">
          <div
            className="rates-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rates-modal-title"
            aria-describedby="rates-modal-description"
          >
            <span className="rates-modal-eyebrow">Antes do primeiro serviço</span>
            <h2 id="rates-modal-title">Configure suas tarifas</h2>
            <p id="rates-modal-description">
              Cadastre o valor da hora e do deslocamento para calcular os novos serviços. Você
              também pode alterá-los depois em Configurações.
            </p>
            {flash?.erro && <div className="notice error">{flash.erro}</div>}
            <form
              className="stack"
              onSubmit={(event) => post(event, '/configuracoes/tarifas', undefined, false)}
            >
              <label>
                Valor da hora (R$)
                <input
                  name="valorHora"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={rates.valorHora}
                  required
                  autoFocus
                />
              </label>
              <label>
                Valor do deslocamento (R$)
                <input
                  name="valorDeslocamento"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={rates.valorDeslocamento}
                  required
                />
              </label>
              <button className="button button-full">
                Salvar tarifas e continuar <Icon name="arrow" size={17} />
              </button>
            </form>
            <ButtonLink href="/servicos" secondary>
              Voltar aos serviços
            </ButtonLink>
          </div>
        </div>
      )}
    </Layout>
  )
}
