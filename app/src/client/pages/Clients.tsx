import { useEffect, useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { Card, Empty, SectionHead } from '../components/ui.js'
import { hasFlashError, post } from '../lib/forms.js'
import type { Client, PageData } from '../types.js'

/** Campos compartilhados pela criação e edição de cliente. */
function ClientFields({ client }: { client?: Client }) {
  return (
    <>
      <label>
        Nome
        <input
          name="nome"
          defaultValue={client?.nome ?? ''}
          placeholder="Nome do cliente ou empresa"
          required
          autoFocus={Boolean(client)}
        />
      </label>
      <label>
        Telefone
        <input
          name="telefone"
          defaultValue={client?.telefone ?? ''}
          placeholder="(00) 00000-0000"
        />
      </label>
      <label>
        E-mail
        <input
          name="email"
          type="email"
          defaultValue={client?.email ?? ''}
          placeholder="cliente@email.com"
        />
      </label>
      <label>
        Documento
        <input name="documento" defaultValue={client?.documento ?? ''} placeholder="CPF ou CNPJ" />
      </label>
      <label>
        Endereço
        <input
          name="endereco"
          defaultValue={client?.endereco ?? ''}
          placeholder="Rua, número, cidade"
        />
      </label>
      <label>
        Observações
        <textarea
          name="observacoes"
          defaultValue={client?.observacoes ?? ''}
          rows={3}
          placeholder="Informações úteis"
        />
      </label>
    </>
  )
}

/** Exibe a edição em uma janela modal e preserva a lista ao fundo. */
function EditClientDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const { flash } = usePage<PageData>().props

  // Abre o dialog nativo ao montar e fecha-o ao sair da edição.
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="client-edit-dialog card"
      aria-labelledby="client-edit-title"
      aria-describedby="client-edit-description"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="client-edit-heading">
        <div>
          <h2 id="client-edit-title">Editar cliente</h2>
          <p id="client-edit-description">Atualize as informações de {client.nome}.</p>
        </div>
        <button
          type="button"
          className="client-edit-close"
          aria-label="Fechar edição"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {submitted && flash?.erro && <div className="notice error">{flash.erro}</div>}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          const data = Object.fromEntries(new FormData(event.currentTarget).entries())
          router.put(`/clientes/${client.id}`, data, {
            onSuccess: (page: { props: unknown }) => {
              if (!hasFlashError(page.props)) onClose()
            },
          })
        }}
      >
        <ClientFields client={client} />
        <div className="client-edit-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button">
            <Icon name="check" size={17} /> Salvar alterações
          </button>
        </div>
      </form>
    </dialog>
  )
}

/** Lista clientes e mantém o formulário de cadastro separado da edição modal. */
export function Clients({ clients }: { clients: Client[] }) {
  const [editing, setEditing] = useState<Client | null>(null)
  return (
    <Layout title="Clientes" subtitle="Contatos e informações dos seus clientes.">
      <div className="split-page">
        {/* Lista os clientes cadastrados e abre a edição no dialog. */}
        <Card>
          <SectionHead title="Seus clientes" />
          <div className="table-wrap">
            {clients.length ? (
              <table>
                <thead>
                  <tr>
                    <th>NOME</th>
                    <th>CONTATO</th>
                    <th>ENDEREÇO</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((item) => (
                    <tr key={item.id}>
                      <td className="table-primary">{item.nome}</td>
                      <td>{item.telefone || item.email || '—'}</td>
                      <td>{item.endereco || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setEditing(item)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty
                title="Nenhum cliente cadastrado"
                description="Adicione um cliente para começar a registrar serviços."
              />
            )}
          </div>
        </Card>
        {/* O formulário lateral permanece dedicado ao cadastro de novos clientes. */}
        <Card className="form-card">
          <h2>Novo cliente</h2>
          <p>Cadastre os dados para usar nos serviços e agendamentos.</p>
          <form className="stack" onSubmit={(event) => post(event, '/clientes')}>
            <ClientFields />
            <button className="button button-full">
              <Icon name="plus" size={17} /> Cadastrar cliente
            </button>
          </form>
        </Card>
      </div>
      {editing && (
        <EditClientDialog key={editing.id} client={editing} onClose={() => setEditing(null)} />
      )}
    </Layout>
  )
}
