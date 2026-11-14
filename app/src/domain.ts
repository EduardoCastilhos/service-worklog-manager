import { Prisma } from './generated/prisma/client.js'

/** Valida uma entrada monetária não negativa e a converte para centavos inteiros. */
export const cents = (value: unknown): number => {
  const text = String(value ?? '0')
    .trim()
    .replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Informe um valor monetário válido.')
  const [whole, fraction = ''] = text.split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(result)) throw new Error('Valor fora do limite permitido.')
  return result
}

/** Converte centavos inteiros para o tipo decimal armazenado pelo Prisma. */
export const decimal = (valueInCents: number) => new Prisma.Decimal((valueInCents / 100).toFixed(2))
/** Converte valores persistidos para centavos antes dos cálculos. */
export const toCents = (value: Prisma.Decimal | number | string) => Math.round(Number(value) * 100)
/** Interpreta YYYY-MM-DD em UTC para preservar datas sem horário no PostgreSQL. */
export const dateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data válida.')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Informe uma data válida.')
  return date
}
/** Serializa uma data de calendário sem introduzir deslocamento de fuso. */
export const isoDate = (value: Date | null | undefined) => value?.toISOString().slice(0, 10) ?? null

/** Formato validado de cada item enviado no cadastro de uma etapa. */
export type ItemInput = {
  tipo: 'MATERIAL' | 'SERVICO_TERCEIRIZADO' | 'OUTRA_DESPESA'
  nome: string
  descricao?: string
  quantidade: number
  valorGasto: number
  valorCobrado: number
  jaPago: boolean
  vencimento: string | null
}

/** Valida tipos, quantidades e valores dos itens recebidos do formulário. */
export function parseItems(value: unknown): ItemInput[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && String(item.nome ?? '').trim())
    .map((item) => {
      const quantidade = Number(String(item.quantidade ?? '1').replace(',', '.'))
      if (
        !Number.isFinite(quantidade) ||
        quantidade <= 0 ||
        Math.abs(Math.round(quantidade * 1000) - quantidade * 1000) > 0.000001
      ) {
        throw new Error('A quantidade deve ser positiva e ter até três casas decimais.')
      }
      const tipo = String(item.tipo || 'MATERIAL')
      if (!['MATERIAL', 'SERVICO_TERCEIRIZADO', 'OUTRA_DESPESA'].includes(tipo))
        throw new Error('Tipo de gasto inválido.')
      return {
        tipo: tipo as ItemInput['tipo'],
        nome: String(item.nome).trim(),
        descricao: String(item.descricao ?? '').trim(),
        quantidade,
        valorGasto: cents(item.valorGasto ?? 0),
        valorCobrado: cents(item.valorCobrado ?? 0),
        jaPago: item.jaPago === true,
        vencimento: item.vencimento ? String(item.vencimento) : null,
      }
    })
}

// Tipos mínimos necessários para calcular registros e ordens sem acoplar o domínio às consultas.
type Material = {
  quantidadeMaterial: Prisma.Decimal
  valorGastoUnidade: Prisma.Decimal
  valorCobradoUnidade: Prisma.Decimal
}
type Registro = {
  minutosTrabalhados: number
  valorHora: Prisma.Decimal
  numeroDeslocamentos: number
  valorDeslocamento: Prisma.Decimal
  custoDeslocamento: Prisma.Decimal
  desconto: Prisma.Decimal
  acrescimo: Prisma.Decimal
  materiaisServicos: Material[]
}
type Ordem = {
  desconto: Prisma.Decimal
  acrescimo: Prisma.Decimal
  registrosServico: Registro[]
  pagamentosRecebidos?: {
    montanteRecebido: Prisma.Decimal
    dataAnulacaoLancamentoIncorreto: Date | null
  }[]
}

/**
 * Calcula uma etapa em centavos. Gastos reais são apurados separadamente e não
 * reduzem o valor cobrado do cliente; descontos e acréscimos afetam a cobrança.
 */
export function totalRegistro(registro: Registro) {
  const maoDeObra = Math.round((registro.minutosTrabalhados * toCents(registro.valorHora)) / 60)
  const deslocamento = registro.numeroDeslocamentos * toCents(registro.valorDeslocamento)
  const itensCobrados = registro.materiaisServicos.reduce(
    (sum, item) =>
      sum + Math.round(Number(item.quantidadeMaterial) * toCents(item.valorCobradoUnidade)),
    0,
  )
  const gastos =
    registro.materiaisServicos.reduce(
      (sum, item) =>
        sum + Math.round(Number(item.quantidadeMaterial) * toCents(item.valorGastoUnidade)),
      0,
    ) + toCents(registro.custoDeslocamento)
  const total = Math.max(
    0,
    maoDeObra +
      deslocamento +
      itensCobrados -
      toCents(registro.desconto) +
      toCents(registro.acrescimo),
  )
  return { maoDeObra, deslocamento, itensCobrados, gastos, total }
}

/** Soma as etapas e considera apenas recebimentos que não foram anulados. */
export function totalOrdem(ordem: Ordem) {
  const registros = ordem.registrosServico.map(totalRegistro)
  const maoDeObra = registros.reduce((sum, item) => sum + item.maoDeObra, 0)
  const deslocamento = registros.reduce((sum, item) => sum + item.deslocamento, 0)
  const itensCobrados = registros.reduce((sum, item) => sum + item.itensCobrados, 0)
  const gastos = registros.reduce((sum, item) => sum + item.gastos, 0)
  const total = Math.max(
    0,
    registros.reduce((sum, item) => sum + item.total, 0) -
      toCents(ordem.desconto) +
      toCents(ordem.acrescimo),
  )
  const recebido = (ordem.pagamentosRecebidos ?? [])
    .filter((item) => !item.dataAnulacaoLancamentoIncorreto)
    .reduce((sum, item) => sum + toCents(item.montanteRecebido), 0)
  return {
    maoDeObra,
    deslocamento,
    itensCobrados,
    gastos,
    total,
    recebido,
    restante: Math.max(0, total - recebido),
  }
}
