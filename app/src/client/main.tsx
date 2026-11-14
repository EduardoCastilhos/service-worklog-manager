import { createRoot } from 'react-dom/client'
import type { ComponentProps } from 'react'
import { App as InertiaApp, createInertiaApp } from '@inertiajs/react'
import type { PageData } from './types.js'
import { Login, Register } from './pages/Auth.js'
import { Dashboard } from './pages/Dashboard.js'
import { Services } from './pages/Services.js'
import { NewService } from './pages/NewService.js'
import { ServiceDetail } from './pages/ServiceDetail.js'
import { Clients } from './pages/Clients.js'
import { Receivables } from './pages/Receivables.js'
import { Payables } from './pages/Payables.js'
import { Schedule } from './pages/Schedule.js'
import { Settings } from './pages/Settings.js'
import { FinanceOverview } from './pages/FinanceOverview.js'
import './style.css'

// Relaciona o nome enviado pelo Fastify ao componente React correspondente.
const pages = {
  Login,
  Register,
  Dashboard,
  Services,
  NewService,
  ServiceDetail,
  Clients,
  Receivables,
  Payables,
  Schedule,
  Settings,
  FinanceOverview,
}

/** Tipos fornecidos pelo Inertia ao montar o componente raiz. */
type Setup = {
  el: HTMLElement
  App: typeof InertiaApp
  props: ComponentProps<typeof InertiaApp>
}

// Resolve a página inicial e mantém as navegações seguintes sob controle do Inertia.
createInertiaApp<PageData>({
  resolve: (name: string) => {
    const component = pages[name as keyof typeof pages]
    if (!component) throw new Error(`Página não encontrada: ${name}`)
    return component
  },
  setup({ el, App, props }: Setup) {
    createRoot(el).render(<App {...props} />)
  },
  progress: { color: '#cf653c' },
})
