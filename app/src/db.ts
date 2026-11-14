// Compartilha um cliente Prisma com o adaptador PostgreSQL entre as rotas.
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

// Falha cedo quando a conexão obrigatória não foi configurada.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não foi configurada. Consulte app/.env.example.')
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const db = new PrismaClient({ adapter })
