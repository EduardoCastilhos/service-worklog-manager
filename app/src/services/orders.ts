import { randomUUID } from 'node:crypto'
import { db } from '../db.js'
import type { Prisma, Usuario } from '../generated/prisma/client.js'
import {
  cents,
  dateOnly,
  decimal,
  isoDate,
  parseItems,
  toCents,
  totalOrdem,
  totalRegistro,
} from '../domain.js'
import { nonNegativeInteger, required } from '../http/input.js'

// Relações necessárias para calcular e apresentar uma ordem completa.
export const orderInclude = {
  cliente: true,
  registrosServico: {
    include: { materiaisServicos: true },
    orderBy: { dataServico: 'asc' as const },
  },
  pagamentosRecebidos: true,
} satisfies Prisma.OrdemServicoInclude

type OrderWithDetails = Prisma.OrdemServicoGetPayload<{ include: typeof orderInclude }>

/** Converte os totais internos em centavos para os reais exibidos na interface. */
function asReais<T extends Record<string, number>>(totals: T): T {
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value / 100])) as T
}
/**
 * Contrato enviado às páginas React. Valores Decimal saem como reais (number),
 * datas de calendário como YYYY-MM-DD e instantes como ISO 8601.
 */
export function serializeOrder(order: OrderWithDetails) {
  const totals = totalOrdem(order)
  return {
    id: order.id,
    nomeServico: order.nomeServico,
    descricao: order.descricao,
    situacao: order.situacao,
    cliente: { id: order.cliente.id, nome: order.cliente.nomeCliente },
    comecoServico: order.comecoServico.toISOString(),
    terminoServico: order.terminoServico?.toISOString() ?? null,
    vencimentoPagamento: isoDate(order.vencimentoPagamento),
    totals: asReais(totals),
    registros: order.registrosServico.map((record) => ({
      id: record.id,
      data: isoDate(record.dataServico),
      nome: record.nomeServico,
      descricao: record.descricaoServico,
      minutos: record.minutosTrabalhados,
      deslocamentos: record.numeroDeslocamentos,
      valorHora: Number(record.valorHora),
      valorDeslocamento: Number(record.valorDeslocamento),
      custoDeslocamento: Number(record.custoDeslocamento),
      desconto: Number(record.desconto),
      acrescimo: Number(record.acrescimo),
      totals: asReais(totalRegistro(record)),
      itens: record.materiaisServicos.map((item) => ({
        id: item.id,
        tipo: item.tipo,
        nome: item.nomeMaterial,
        descricao: item.descricaoMaterial,
        quantidade: Number(item.quantidadeMaterial),
        valorGasto: Number(item.valorGastoUnidade),
        valorCobrado: Number(item.valorCobradoUnidade),
        jaPago: item.jaPago,
      })),
    })),
    pagamentos: order.pagamentosRecebidos
      .filter((payment) => !payment.dataAnulacaoLancamentoIncorreto)
      .map((payment) => ({
        id: payment.id,
        valor: Number(payment.montanteRecebido),
        pagoEm: payment.pagoEm.toISOString(),
        forma: payment.formaPagamento,
      })),
  }
}
/** Lista somente as ordens do usuário e aplica o contrato de apresentação. */
export async function ordersFor(userId: string) {
  const orders = await db.ordemServico.findMany({
    where: { usuarioId: userId },
    include: orderInclude,
    orderBy: { comecoServico: 'desc' },
  })
  return orders.map(serializeOrder)
}

/** Monta uma etapa com as tarifas atuais do usuário, fixadas no histórico. */
export function recordData(
  input: Record<string, unknown>,
  user: Pick<Usuario, 'valorHora' | 'valorDeslocamento'>,
) {
  const items = parseItems(input.itens)
  return {
    dataServico: dateOnly(required(input.data, 'a data do serviço')),
    nomeServico: required(input.nomeRegistro || input.nomeServico, 'o nome do serviço'),
    descricaoServico: String(input.descricaoRegistro ?? input.descricao ?? '').trim(),
    minutosTrabalhados: nonNegativeInteger(input.minutos, 'O tempo trabalhado'),
    valorHora: user.valorHora,
    numeroDeslocamentos: nonNegativeInteger(input.deslocamentos, 'O número de deslocamentos'),
    valorDeslocamento: user.valorDeslocamento,
    custoDeslocamento: decimal(0),
    desconto: decimal(cents(input.descontoRegistro ?? 0)),
    acrescimo: decimal(cents(input.acrescimoRegistro ?? 0)),
    materiaisServicos: {
      create: items.map((item) => ({
        id: randomUUID(),
        tipo: item.tipo,
        nomeMaterial: item.nome,
        descricaoMaterial: item.descricao ?? '',
        quantidadeMaterial: item.quantidade,
        valorGastoUnidade: decimal(item.valorGasto),
        valorCobradoUnidade: decimal(item.valorCobrado),
        jaPago: item.jaPago,
        vencimentoPagamento: !item.jaPago && item.vencimento ? dateOnly(item.vencimento) : null,
      })),
    },
  }
}

/** Cria contas somente para itens com custo e ainda não pagos, na mesma transação do registro. */
export async function createMaterialPayables(
  tx: Prisma.TransactionClient,
  userId: string,
  orderId: string,
  recordId: string,
) {
  const record = await tx.registroServico.findUniqueOrThrow({
    where: { id: recordId },
    include: { materiaisServicos: true },
  })
  const bills = record.materiaisServicos.flatMap((item) => {
    const value = Math.round(Number(item.quantidadeMaterial) * toCents(item.valorGastoUnidade))
    if (item.jaPago || value <= 0) return []
    return [
      {
        usuarioId: userId,
        ordemServicoId: orderId,
        materialServicoId: item.id,
        descricao: item.nomeMaterial,
        categoria: item.tipo === 'MATERIAL' ? 'Material de serviço' : 'Item de serviço',
        valor: decimal(value),
        vencimento: item.vencimentoPagamento ?? record.dataServico,
      },
    ]
  })
  if (bills.length) await tx.contaPagar.createMany({ data: bills })
}
