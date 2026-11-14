/** Contrato serializado de uma ordem, suas etapas, itens e pagamentos. */
export type Order = {
  id: string
  nomeServico: string
  descricao: string
  situacao: string
  cliente: { id: string; nome: string }
  comecoServico: string
  vencimentoPagamento: string | null
  totals: {
    maoDeObra: number
    deslocamento: number
    itensCobrados: number
    gastos: number
    total: number
    recebido: number
    restante: number
  }
  registros: {
    id: string
    data: string
    nome: string
    descricao: string
    minutos: number
    deslocamentos: number
    valorHora: number
    valorDeslocamento: number
    custoDeslocamento: number
    totals: {
      total: number
      gastos: number
      maoDeObra: number
      deslocamento: number
      itensCobrados: number
    }
    itens: {
      id: string
      nome: string
      tipo: string
      quantidade: number
      valorGasto: number
      valorCobrado: number
      jaPago: boolean | null
    }[]
  }[]
  pagamentos: { id: string; valor: number; pagoEm: string; forma: string }[]
}
/** Tarifas atuais do perfil, usadas na prévia de novas etapas. */
export type Rates = { valorHora: number; valorDeslocamento: number }

/** Dados de cliente exibidos e editados pela interface. */
export type Client = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  documento: string | null
  observacoes: string | null
}

/** Conta a pagar manual ou vinculada a um material. */
export type Bill = {
  id: string
  descricao: string
  categoria: string | null
  valor: number
  vencimento: string
  pagoEm: string | null
  materialServicoId: string | null
  ordemServicoId: string | null
  cliente: string | null
  clienteId: string | null
}

/** Compromisso apresentado na agenda e na visão geral. */
export type Appointment = {
  id: string
  titulo: string
  descricao: string | null
  inicio: string
  fim: string | null
  concluidoEm: string | null
  cliente: string | null
}

/** Totais compactos mostrados na visão geral. */
export type DashboardMetrics = {
  emAberto: number
  aReceber: number
  aPagar: number
}

/** Indicadores calculados para um recorte financeiro. */
export type FinanceTotals = {
  faturado: number
  recebido: number
  aReceber: number
  gastos: number
  despesasPagas: number
  lucro: number
  saldoCaixa: number
}

/** Propriedades compartilhadas entre todas as páginas Inertia. */
export type PageData = {
  user?: { nome: string }
  flash?: { erro?: string | null; sucesso?: string | null }
  [key: string]: unknown
}
