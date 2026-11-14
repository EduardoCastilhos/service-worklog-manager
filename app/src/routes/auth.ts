import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { decimal } from '../domain.js'
import { body, required } from '../http/input.js'
import { failure, page, redirect } from '../http/inertia.js'
import {
  beginSession,
  cookieName,
  currentUser,
  passwordHash,
  secureCookie,
  sessionToken,
  verifyPassword,
} from '../http/security.js'

/** Registra cadastro, login e encerramento da sessão. */
export function registerAuthRoutes(app: FastifyInstance) {
  // Exibe o formulário somente para visitantes sem sessão ativa.
  app.get('/login', async (request, reply) => {
    if (await currentUser(request)) return redirect(reply, '/')
    return page(request, reply, 'Login', {})
  })
  // Compartilha a mesma restrição para a página de criação de conta.
  app.get('/cadastro', async (request, reply) => {
    if (await currentUser(request)) return redirect(reply, '/')
    return page(request, reply, 'Register', {})
  })
  // Valida a entrada, cria o usuário sem tarifas iniciais e inicia sua sessão.
  app.post('/cadastro', async (request, reply) => {
    try {
      const input = body(request)
      const nome = required(input.nome, 'seu nome')
      const email = required(input.email, 'seu e-mail').toLowerCase()
      const senha = required(input.senha, 'uma senha')
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.')
      if (senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.')
      const user = await db.usuario.create({
        data: {
          nome,
          email,
          senhaHash: await passwordHash(senha),
          valorHora: decimal(0),
          valorDeslocamento: decimal(0),
          ativo: true,
        },
      })
      await beginSession(reply, user.id)
      return redirect(reply, '/', 'sucesso', 'Conta criada. Bem-vindo!')
    } catch (error) {
      return failure(request, reply, error)
    }
  })
  // Confere a senha com o hash salvo antes de emitir um novo cookie.
  app.post('/login', async (request, reply) => {
    const input = body(request)
    const user = await db.usuario.findUnique({
      where: {
        email: String(input.email ?? '')
          .trim()
          .toLowerCase(),
      },
    })
    if (!user || !(await verifyPassword(String(input.senha ?? ''), user.senhaHash)))
      return redirect(reply, '/login', 'erro', 'E-mail ou senha inválidos.')
    await beginSession(reply, user.id)
    return redirect(reply, '/')
  })
  // Revoga o token no banco e remove o cookie do navegador.
  app.post('/sair', async (request, reply) => {
    const token = sessionToken(request)
    if (token)
      await db.sessaoAcesso.updateMany({
        where: { tokenHash: createHash('sha256').update(token).digest('hex') },
        data: { revogadaEm: new Date() },
      })
    reply.header(
      'Set-Cookie',
      `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookie ? '; Secure' : ''}`,
    )
    return redirect(reply, '/login')
  })
}
