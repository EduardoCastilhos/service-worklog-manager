import type { FastifyReply, FastifyRequest } from 'fastify'

/** Referencia os arquivos que o Vite grava em public/build para o servidor entregar. */
function assets() {
  return '<link rel="stylesheet" href="/build/assets/app.css"><script type="module" src="/build/assets/app.js"></script>'
}
/** Escapa o JSON embutido no HTML para que dados do usuário não fechem a tag script. */
function scriptJson(value: unknown) {
  // Um '<' literal permitiria que dados como </script> encerrassem o bloco JSON.
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}
/** Responde com HTML inicial ou com os dados Inertia para navegação interna. */
export function page(
  request: FastifyRequest,
  reply: FastifyReply,
  component: string,
  props: Record<string, unknown>,
) {
  const query = request.query as Record<string, string | undefined>
  const data = {
    component,
    props: { ...props, flash: { erro: query.erro ?? null, sucesso: query.sucesso ?? null } },
    url: request.url,
    version: '1',
  }
  reply.header('Vary', 'X-Inertia').header('Cache-Control', 'private, no-store')
  if (request.headers['x-inertia']) return reply.header('X-Inertia', 'true').send(data)
  return reply
    .type('text/html')
    .send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>service-worklog-manager</title><link rel="icon" type="image/svg+xml" href="/favicon.svg">${assets()}</head><body><script data-page="app" type="application/json">${scriptJson(data)}</script><div id="app"></div></body></html>`,
    )
}
/** Monta o redirecionamento após uma ação e transporta a mensagem de retorno. */
export function redirect(
  reply: FastifyReply,
  url: string,
  kind?: 'erro' | 'sucesso',
  message?: string,
) {
  const target = new URL(url, 'http://localhost')
  if (kind && message) target.searchParams.set(kind, message)
  return reply.code(303).redirect(target.pathname + target.search)
}
/** Converte falhas de gravação em mensagens e retorna à página que enviou o formulário. */
export function failure(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : null
  const message =
    code === 'P2002'
      ? 'Este dado já está cadastrado.'
      : code
        ? 'Não foi possível salvar os dados.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível salvar os dados.'
  const referer = request.headers.referer
  let target = '/'
  if (referer) {
    try {
      const source = new URL(referer)
      if (source.host === request.headers.host) target = source.pathname
    } catch {
      /* ignore */
    }
  }
  return redirect(reply, target, 'erro', message)
}
