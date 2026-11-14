import type { ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import type { PageData } from '../types.js'
import { Icon } from './Icon.js'

/** Envolve páginas autenticadas com menu, título e mensagens de retorno. */
export function Layout({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const page = usePage<PageData>()
  const { user, flash } = page.props
  // A ordem aqui determina a ordem dos links na barra lateral e no menu móvel.
  const items: [string, string, string][] = [
    ['/', 'Visão geral', 'grid'],
    ['/servicos', 'Histórico', 'briefcase'],
    ['/clientes', 'Clientes', 'users'],
    ['/agenda', 'Agenda', 'calendar'],
    ['/receber', 'A receber', 'down'],
    ['/pagar', 'A pagar', 'up'],
    ['/financas', 'Finanças', 'briefcase'],
    ['/configuracoes', 'Configurações', 'settings'],
  ]
  // Ignora filtros na URL ao determinar o item de navegação ativo.
  const pathname = page.url.split('?')[0]
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="nav">
          {items.map(([href, label, icon]) => {
            const active =
              pathname === href || (href === '/servicos' && pathname.startsWith('/servicos'))
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`nav-link${active ? ' active' : ''}`}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">{user?.nome?.slice(0, 1).toUpperCase() ?? 'O'}</span>
            <span className="nome-e-conta">
              <h3 className="nome-perfil">{user?.nome ?? 'Profissional'}</h3>
              <h4 className="minha-conta">Minha conta</h4>
            </span>
          </div>
          <button
            className="logout"
            onClick={() => router.post('/sair')}
            title="Sair"
            aria-label="Sair da conta"
          >
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="content">
          <div className="page-heading">
            <div>
              <h1 className="titulo-dashboard">{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {action && <div className="heading-action">{action}</div>}
          </div>
          {flash?.erro && <div className="notice error">{flash.erro}</div>}
          {flash?.sucesso && <div className="notice success">{flash.sucesso}</div>}
          {children}
        </div>
      </main>
    </div>
  )
}
