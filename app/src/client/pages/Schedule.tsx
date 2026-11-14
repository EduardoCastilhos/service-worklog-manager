import { router } from '@inertiajs/react'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { Card, Empty, SectionHead } from '../components/ui.js'
import { dateTime } from '../lib/format.js'
import { post } from '../lib/forms.js'
import type { Appointment } from '../types.js'

/** Separa a agenda em compromissos pendentes e concluídos e cria novos horários. */
export function Schedule({
  appointments,
  clients,
}: {
  appointments: Appointment[]
  clients: { id: string; nome: string }[]
}) {
  // Mantém o histórico visível sem misturá-lo aos próximos compromissos.
  const upcoming = appointments.filter((item) => !item.concluidoEm),
    done = appointments.filter((item) => item.concluidoEm)
  return (
    <Layout title="Agenda" subtitle="Planeje os próximos atendimentos em um só lugar.">
      <div className="split-page">
        <div className="stack">
          {/* Compromissos ainda não concluídos, em ordem de início. */}
          <Card>
            <SectionHead title="Próximos agendamentos" />
            {upcoming.length ? (
              <div className="list">
                {upcoming.map((item) => (
                  <div className="list-row" key={item.id}>
                    <span className="date-block">
                      <strong>{new Date(item.inicio).getDate()}</strong>
                      <small>
                        {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                          .format(new Date(item.inicio))
                          .replace('.', '')}
                      </small>
                    </span>
                    <span className="row-content">
                      <strong>{item.titulo}</strong>
                      <small>
                        {dateTime(item.inicio)}
                        {item.cliente ? ` · ${item.cliente}` : ''}
                      </small>
                      {item.descricao && <small>{item.descricao}</small>}
                    </span>
                    <button
                      className="icon-button"
                      title="Concluir agendamento"
                      onClick={() => router.post(`/agenda/${item.id}/concluir`)}
                    >
                      <Icon name="check" size={17} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Agenda livre" description="Adicione um atendimento para vê-lo aqui." />
            )}
          </Card>
          {/* Histórico de agendamentos encerrados. */}
          {done.length > 0 && (
            <Card>
              <SectionHead title="Concluídos" />
              <div className="list">
                {done.map((item) => (
                  <div className="list-row faded" key={item.id}>
                    <span className="bill-icon muted">
                      <Icon name="check" size={19} />
                    </span>
                    <span className="row-content">
                      <strong>{item.titulo}</strong>
                      <small>
                        {dateTime(item.inicio)}
                        {item.cliente ? ` · ${item.cliente}` : ''}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        {/* Formulário de um novo horário, opcionalmente associado a um cliente. */}
        <Card className="form-card">
          <h2>Novo agendamento</h2>
          <p>Reserve um horário para o próximo serviço.</p>
          <form
            className="stack"
            onSubmit={(event) =>
              post(event, '/agenda', (raw) => ({
                ...raw,
                inicio: new Date(String(raw.inicio)).toISOString(),
                fim: raw.fim ? new Date(String(raw.fim)).toISOString() : null,
              }))
            }
          >
            <label>
              Título
              <input name="titulo" placeholder="Ex.: Visita para manutenção" required />
            </label>
            <label>
              Cliente
              <select name="clienteId">
                <option value="">Sem cliente vinculado</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-grid">
              <label>
                Início
                <input name="inicio" type="datetime-local" required />
              </label>
              <label>
                Fim (opcional)
                <input name="fim" type="datetime-local" />
              </label>
            </div>
            <label>
              Descrição
              <textarea name="descricao" rows={3} placeholder="Anotações sobre o atendimento" />
            </label>
            <button className="button button-full">
              <Icon name="plus" size={17} /> Agendar serviço
            </button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
