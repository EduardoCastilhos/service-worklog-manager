/** Formata números em reais nos cartões e tabelas. */
export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
/** Exibe datas de calendário sem deslocá-las para o fuso do navegador. */
export const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
        new Date(value.slice(0, 10) + 'T12:00:00Z'),
      )
    : 'Sem data'
/** Exibe instantes com data e hora no fuso local do navegador. */
export const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Sem data'
/** Preenche inputs date com a data local no formato YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString('en-CA')
/** Rótulos legíveis para os estados persistidos no banco. */
export const statusName: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}
