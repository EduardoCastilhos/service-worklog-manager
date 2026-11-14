import { Layout } from '../components/Layout.js'
import { Icon } from '../components/Icon.js'
import { Card } from '../components/ui.js'
import { post } from '../lib/forms.js'

/** Edita nome e tarifas atuais sem recalcular serviços já registrados. */
export function Settings({
  settings,
}: {
  settings: {
    nome: string
    email: string
    valorHora: number
    valorDeslocamento: number
    tarifasConfiguradas: boolean
  }
}) {
  return (
    <Layout
      title="Configurações"
      subtitle="Ajuste seus dados e os valores usados nos próximos serviços."
    >
      <div className="settings-wrap">
        {/* A atualização afeta apenas novas etapas; ordens antigas retêm suas tarifas. */}
        <Card className="form-card">
          <h2>Seu perfil e tarifas</h2>
          <p>As mudanças de tarifa valem apenas para novos registros.</p>
          {!settings.tarifasConfiguradas && (
            <div className="notice info">
              Cadastre os valores da hora e do deslocamento antes de registrar seu primeiro serviço.
            </div>
          )}
          <form
            className="stack"
            onSubmit={(event) => post(event, '/configuracoes', undefined, false)}
          >
            <label>
              Seu nome
              <input name="nome" defaultValue={settings.nome} required />
            </label>
            <label>
              E-mail
              <input value={settings.email} readOnly />
            </label>
            <div className="field-grid">
              <label>
                Valor da hora (R$)
                <input
                  type="number"
                  name="valorHora"
                  min="0"
                  step="0.01"
                  defaultValue={settings.valorHora}
                  required
                />
              </label>
              <label>
                Valor do deslocamento (R$)
                <input
                  type="number"
                  name="valorDeslocamento"
                  min="0"
                  step="0.01"
                  defaultValue={settings.valorDeslocamento}
                  required
                />
              </label>
            </div>
            <button className="button">
              Salvar alterações <Icon name="check" size={17} />
            </button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
