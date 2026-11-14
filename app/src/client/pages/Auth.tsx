import type { ReactNode } from 'react'
import { Link, usePage } from '@inertiajs/react'
import type { PageData } from '../types.js'
import { Icon } from '../components/Icon.js'
import { post } from '../lib/forms.js'

/** Compartilha a estrutura visual e as mensagens de login e cadastro. */
function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title: string
  subtitle: string
}) {
  const { flash } = usePage<PageData>().props
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-art">
          <div className="art-card">
            <h3 className="subtitulo">SERVIÇOS · AGENDA · FINANÇAS</h3>
            <h1 className="titulo"> SERVICE WORKLOG MANAGER </h1>
            <div className="art-line" />
            <p className="rodape-texto">Um registro claro para cada etapa do seu trabalho.</p>
          </div>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {flash?.erro && <div className="notice error">{flash.erro}</div>}
          {flash?.sucesso && <div className="notice success">{flash.sucesso}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}

/** Formulário que inicia uma sessão por e-mail e senha. */
export function Login() {
  return (
    <AuthShell
      title="Bom ter você de volta."
      subtitle="Acesse sua área de trabalho para continuar de onde parou."
    >
      <form onSubmit={(event) => post(event, '/login')} className="stack auth-fields">
        <label>
          E-mail
          <input
            type="email"
            name="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="senha"
            placeholder="Sua senha"
            required
            autoComplete="current-password"
          />
        </label>
        <button className="button button-full">
          Entrar <Icon name="arrow" size={18} />
        </button>
      </form>
      <p className="auth-foot">
        Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </AuthShell>
  )
}
/** Cadastro inicial sem as tarifas, definidas posteriormente em Configurações. */
export function Register() {
  return (
    <AuthShell
      title="Comece por aqui."
      subtitle="Crie sua conta para organizar clientes, agenda e serviços."
    >
      <form onSubmit={(event) => post(event, '/cadastro')} className="stack auth-fields">
        <label>
          Seu nome
          <input name="nome" placeholder="Como podemos chamar você?" required />
        </label>
        <label>
          E-mail
          <input
            type="email"
            name="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="senha"
            minLength={8}
            placeholder="Pelo menos 8 caracteres"
            required
            autoComplete="new-password"
          />
        </label>
        <button className="button button-full">
          Criar minha conta <Icon name="arrow" size={18} />
        </button>
      </form>
      <p className="auth-foot">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </AuthShell>
  )
}
