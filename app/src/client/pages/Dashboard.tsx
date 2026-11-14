import type { Appointment, Bill, DashboardMetrics, Order } from '../types.js'
import { Link } from '@inertiajs/react'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { ButtonLink, Card, Empty, SectionHead } from '../components/ui.js'
import { date, dateTime, money } from '../lib/format.js'

/** Reúne métricas e listas curtas de agenda, contas e serviços recentes. */
export function Dashboard({
  user,
  orders,
  receivables,
  bills,
  appointments,
  metrics,
}: {
  user: { nome: string }
  orders: Order[]
  receivables: Order[]
  bills: Pick<Bill, 'id' | 'descricao' | 'valor' | 'vencimento'>[]
  appointments: Pick<Appointment, 'id' | 'titulo' | 'inicio' | 'cliente'>[]
  metrics: DashboardMetrics
}) {
  const firstName = user.nome.split(' ')[0]
  return (
    <Layout
      title={`Olá, ${firstName}.`}
      action={
        <ButtonLink href="/servicos/novo" className="botao-mais button-full">
          <Icon name="plus" size={18} /> Novo serviço
        </ButtonLink>
      }
    >
      {/* Resumo de faturamento, pendências e agenda. */}
      <div className="metric-grid">
        <Card className="metric-card featured">
          <div className="metric-top">
            <span>Você tem a receber</span>
            <span className="metric-icon">
              <Icon name="down" size={19} />
            </span>
          </div>
          <strong>{money(metrics.aReceber)}</strong>
          <small>Saldo pendente dos serviços</small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Contas a pagar</span>
            <span className="metric-icon">
              <Icon name="up" size={19} />
            </span>
          </div>
          <strong>{money(metrics.aPagar)}</strong>
          <small>Valores ainda em aberto</small>
        </Card>
        <Card className="metric-card">
          <div className="metric-top">
            <span>Serviços em andamento</span>
            <span className="metric-icon">
              <Icon name="briefcase" size={19} />
            </span>
          </div>
          <strong>{metrics.emAberto}</strong>
          <small>Trabalhos com continuidade</small>
        </Card>
      </div>
      {/* Próximos compromissos e contas que exigem atenção. */}
      <div className="dashboard-grid">
        <Card>
          <SectionHead title="Próximos serviços" href="/agenda" link="Abrir agenda" />
          {appointments.length ? (
            <div className="list">
              {appointments.map((item) => (
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
                      {item.cliente ?? 'Sem cliente'} · {dateTime(item.inicio).split(' ')[1]}
                    </small>
                  </span>
                  <span className="row-end">Agendado</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Agenda livre por enquanto"
              description="Seus próximos atendimentos aparecerão aqui."
              href="/agenda"
              action="Agendar serviço"
            />
          )}
        </Card>
        <Card>
          <SectionHead title="Contas próximas a pagar" href="/pagar" />
          {bills.length ? (
            <div className="list">
              {bills.map((item) => (
                <div className="list-row" key={item.id}>
                  <span className="bill-icon">
                    <Icon name="up" size={19} />
                  </span>
                  <span className="row-content">
                    <strong>{item.descricao}</strong>
                    <small>Vence em {date(item.vencimento)}</small>
                  </span>
                  <strong className="row-value">{money(item.valor)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Tudo em dia"
              description="As contas pendentes aparecerão aqui."
              href="/pagar"
              action="Adicionar conta"
            />
          )}
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card>
          <SectionHead title="A receber" href="/receber" />
          {receivables.length ? (
            <div className="list">
              {receivables.map((item) => (
                <Link href={`/servicos/${item.id}`} className="list-row linked" key={item.id}>
                  <span className="bill-icon muted">
                    <Icon name="down" size={19} />
                  </span>
                  <span className="row-content">
                    <strong>{item.nomeServico}</strong>
                    <small>
                      {item.cliente.nome} ·{' '}
                      {item.vencimentoPagamento
                        ? `Vence ${date(item.vencimentoPagamento)}`
                        : 'Sem vencimento'}
                    </small>
                  </span>
                  <strong className="row-value">{money(item.totals.restante)}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Nenhum recebimento pendente"
              description="Os serviços com saldo em aberto aparecerão aqui."
            />
          )}
        </Card>
        <Card>
          <SectionHead title="Serviços recentes" href="/servicos" />
          {orders.length ? (
            <div className="list">
              {orders.map((item) => (
                <Link href={`/servicos/${item.id}`} className="list-row linked" key={item.id}>
                  <span className="bill-icon dark">
                    <Icon name="briefcase" size={19} />
                  </span>
                  <span className="row-content">
                    <strong>{item.nomeServico}</strong>
                    <small>
                      {item.cliente.nome} · {date(item.comecoServico)}
                    </small>
                  </span>
                  <strong className="row-value">{money(item.totals.total)}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Seu histórico começa aqui"
              description="Cadastre seu primeiro serviço para acompanhar valores e etapas."
              href="/servicos/novo"
              action="Novo serviço"
            />
          )}
        </Card>
      </div>
    </Layout>
  )
}
