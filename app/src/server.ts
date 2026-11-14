// Inicia o processo HTTP local; a Vercel importa diretamente a aplicação de app.ts.
import { app } from './app.js'

app.listen({ port: Number(process.env.PORT ?? 3333), host: '0.0.0.0' }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})
