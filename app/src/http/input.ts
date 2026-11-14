// Normaliza e valida os valores de entrada usados pelas rotas HTTP.
import type { FastifyRequest } from 'fastify'

export function body(request: FastifyRequest): Record<string, unknown> {
  return (request.body ?? {}) as Record<string, unknown>
}
/** Exige texto não vazio e devolve o valor sem espaços nas pontas. */
export function required(value: unknown, label: string) {
  const result = String(value ?? '').trim()
  if (!result) throw new Error(`Informe ${label}.`)
  return result
}
/** Aceita apenas contagens inteiras não negativas. */
export function nonNegativeInteger(value: unknown, label: string) {
  const result = Number(value ?? 0)
  if (!Number.isSafeInteger(result) || result < 0)
    throw new Error(`${label} deve ser um número inteiro positivo.`)
  return result
}
