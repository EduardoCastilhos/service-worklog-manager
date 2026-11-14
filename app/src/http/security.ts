import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '../db.js'
import { redirect } from './inertia.js'

// Sessões são armazenadas no banco pelo hash do token; o navegador recebe só o token.
const scrypt = promisify(scryptCallback)
export const cookieName = 'swm_session'
export const secureCookie = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

/** Extrai o token do cookie de sessão recebido na requisição. */
export function sessionToken(request: FastifyRequest) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + '='))
  return cookie?.slice(cookieName.length + 1)
}
/** Localiza uma sessão ativa pelo hash do token guardado no cookie HTTP only. */
export async function currentUser(request: FastifyRequest) {
  const token = sessionToken(request)
  if (!token) return null
  const session = await db.sessaoAcesso.findUnique({
    where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    include: { usuario: true },
  })
  if (!session || session.revogadaEm || session.expiraEm <= new Date() || !session.usuario.ativo)
    return null
  return session.usuario
}
/** Protege uma rota e redireciona visitas sem sessão para o login. */
export async function auth(request: FastifyRequest, reply: FastifyReply) {
  const user = await currentUser(request)
  if (!user) redirect(reply, '/login')
  return user
}
/** Gera salt e hash scrypt para uma senha nova. */
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}
/** Compara a senha informada com o hash salvo em tempo constante. */
export async function verifyPassword(password: string, stored: string) {
  const [salt, original] = stored.split(':')
  if (!salt || !original) return false
  const derived = (await scrypt(password, salt, 64)) as Buffer
  const previous = Buffer.from(original, 'hex')
  return previous.length === derived.length && timingSafeEqual(previous, derived)
}
/** Persiste uma sessão de 30 dias e define o cookie HTTP only. */
export async function beginSession(reply: FastifyReply, userId: string) {
  const token = randomBytes(32).toString('hex')
  await db.sessaoAcesso.create({
    data: {
      usuarioId: userId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiraEm: new Date(Date.now() + 30 * 86400000),
    },
  })
  reply.header(
    'Set-Cookie',
    `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureCookie ? '; Secure' : ''}`,
  )
}
