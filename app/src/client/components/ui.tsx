import type { ReactNode } from 'react'
import { Link } from '@inertiajs/react'
import { statusName } from '../lib/format.js'
import { Icon } from './Icon.js'

/** Link Inertia com o mesmo visual dos botões de ação. */
export function ButtonLink({
  href,
  children,
  secondary = false,
  className = '',
}: {
  href: string
  children: ReactNode
  secondary?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={['button', secondary && 'secondary', className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
/** Superfície padrão reutilizada em formulários, métricas e tabelas. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}
/** Mensagem e ação opcional quando uma lista não possui registros. */
export function Empty({
  title,
  description,
  href,
  action,
}: {
  title: string
  description: string
  href?: string | undefined
  action?: string
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <ButtonLink href={href}>
          <Icon name="plus" size={17} />
          {action ?? 'Adicionar'}
        </ButtonLink>
      )}
    </div>
  )
}
/** Título de seção com link opcional para a lista completa. */
export function SectionHead({
  title,
  href,
  link,
}: {
  title: string
  href?: string
  link?: string
}) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {href && (
        <Link href={href}>
          {link ?? 'Ver todos'} <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  )
}
/** Traduz e colore o estado de uma ordem de serviço. */
export function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value.toLowerCase()}`}>
      <span className="status-dot" />
      {statusName[value] ?? value}
    </span>
  )
}
