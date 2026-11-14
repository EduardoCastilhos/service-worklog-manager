// Exercita o fluxo HTTP completo com banco e verifica os assets entregues ao navegador.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { app } from '../src/app.js'
import { db } from '../src/db.js'

test('cadastro, serviço contínuo, recebimento, conta e agenda', async () => {
  const email = `teste-${randomUUID()}@example.invalid`
  let userId: string | undefined
  try {
    const loginPage = await app.inject({ method: 'GET', url: '/login' })
    assert.equal(loginPage.statusCode, 200)
    const initialPage = loginPage.body.match(
      /<script data-page="app" type="application\/json">([^<]*)<\/script>/,
    )?.[1]
    assert.ok(initialPage)
    assert.equal(JSON.parse(initialPage).component, 'Login')
    const cssPath = loginPage.body.match(/href="(\/assets\/[^\"]+\.css)"/)?.[1]
    const jsPath = loginPage.body.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1]
    assert.ok(cssPath)
    assert.ok(jsPath)
    assert.doesNotMatch(loginPage.body, /localhost:5173/)
    assert.equal((await app.inject({ method: 'GET', url: cssPath })).statusCode, 200)
    assert.equal((await app.inject({ method: 'GET', url: jsPath })).statusCode, 200)
    assert.equal((await app.inject({ method: 'GET', url: '/' })).statusCode, 303)
    const signup = await app.inject({
      method: 'POST',
      url: '/cadastro',
      payload: {
        nome: 'Usuário de teste',
        email,
        senha: 'senha-de-teste-123',
      },
    })
    assert.equal(signup.statusCode, 303)
    const cookie = String(signup.headers['set-cookie']).split(';')[0]
    userId = (await db.usuario.findUniqueOrThrow({ where: { email } })).id
    const headers = { cookie, 'x-inertia': 'true' }
    const newService = await app.inject({ method: 'GET', url: '/servicos/novo', headers })
    assert.equal(newService.json().props.ratesConfigured, false)
    const withoutRates = await app.inject({
      method: 'POST',
      url: '/servicos',
      headers,
      payload: { nomeServico: 'Sem tarifa' },
    })
    assert.match(String(withoutRates.headers.location), /erro=/)
    const saveRates = await app.inject({
      method: 'POST',
      url: '/configuracoes/tarifas',
      headers,
      payload: { valorHora: '80', valorDeslocamento: '25' },
    })
    assert.match(String(saveRates.headers.location), /sucesso=/)
    assert.equal(
      (await app.inject({ method: 'GET', url: '/servicos/novo', headers })).json().props
        .ratesConfigured,
      true,
    )

    const client = await app.inject({
      method: 'POST',
      url: '/clientes',
      headers,
      payload: { nome: 'Cliente Teste' },
    })
    assert.equal(client.statusCode, 303)
    const clienteId = (await db.cliente.findFirstOrThrow({ where: { usuarioId: userId } })).id
    const editClient = await app.inject({
      method: 'PUT',
      url: `/clientes/${clienteId}`,
      headers,
      payload: {
        nome: 'Cliente Editado',
        telefone: '11999999999',
        email: 'cliente@example.invalid',
        documento: '123',
        endereco: 'Rua A',
        observacoes: 'Teste',
      },
    })
    assert.match(String(editClient.headers.location), /sucesso=/)
    const edited = (await app.inject({ method: 'GET', url: '/clientes', headers })).json().props
      .clients[0]
    assert.equal(edited.nome, 'Cliente Editado')
    assert.equal(edited.observacoes, 'Teste')

    const create = await app.inject({
      method: 'POST',
      url: '/servicos',
      headers,
      payload: {
        clienteId,
        nomeServico: 'Manutenção',
        descricao: 'Máquina de calçado',
        continuar: true,
        data: '2026-10-21',
        nomeRegistro: 'Primeiro dia',
        minutos: 90,
        deslocamentos: 2,
        custoDeslocamento: '999',
        itens: [
          {
            tipo: 'MATERIAL',
            nome: 'Correia',
            quantidade: 2,
            valorGasto: '10',
            valorCobrado: '18',
            jaPago: false,
            vencimento: '2026-10-30',
          },
          {
            tipo: 'MATERIAL',
            nome: 'Parafuso',
            quantidade: 1,
            valorGasto: '5',
            valorCobrado: '0',
            jaPago: true,
          },
        ],
        vencimento: '2026-10-31',
      },
    })
    assert.equal(create.statusCode, 303)
    assert.match(String(create.headers.location), /^\/servicos\/novo\?sucesso=/)
    const ordemId = (await db.ordemServico.findFirstOrThrow({ where: { usuarioId: userId } })).id
    const first = await app.inject({ method: 'GET', url: `/servicos/${ordemId}`, headers })
    assert.equal(first.statusCode, 200)
    assert.equal(first.json().props.order.totals.total, 206)
    assert.equal(first.json().props.order.registros.length, 1)
    assert.equal(first.json().props.order.registros[0].valorDeslocamento, 25)
    assert.equal(first.json().props.order.registros[0].custoDeslocamento, 0)
    assert.equal(first.json().props.order.registros[0].itens.length, 2)
    assert.equal(first.json().props.order.registros[0].itens[0].jaPago, false)
    assert.equal(first.json().props.order.registros[0].itens[1].jaPago, true)
    const autoBills = await db.contaPagar.findMany({ where: { usuarioId: userId } })
    assert.equal(autoBills.length, 1)
    const materialBill = autoBills[0]
    assert.ok(materialBill)
    assert.equal(Number(materialBill.valor), 20)
    assert.ok(materialBill.materialServicoId)

    const followup = await app.inject({
      method: 'POST',
      url: `/servicos/${ordemId}/registros`,
      headers,
      payload: {
        nomeRegistro: 'Segundo dia',
        data: '2026-10-22',
        minutos: 30,
        deslocamentos: 1,
        itens: [
          {
            tipo: 'MATERIAL',
            nome: 'Lubrificante',
            quantidade: 1,
            valorGasto: '3',
            valorCobrado: '0',
            jaPago: false,
          },
        ],
      },
    })
    assert.equal(followup.statusCode, 303)
    assert.equal(
      await db.contaPagar.count({ where: { usuarioId: userId, materialServicoId: { not: null } } }),
      2,
    )
    const payment = await app.inject({
      method: 'POST',
      url: `/servicos/${ordemId}/receber`,
      headers,
      payload: { valor: '100', forma: 'PIX' },
    })
    assert.equal(payment.statusCode, 303)
    const detail = await app.inject({ method: 'GET', url: `/servicos/${ordemId}`, headers })
    assert.equal(detail.json().props.order.registros.length, 2)
    assert.equal(detail.json().props.order.totals.total, 271)
    assert.equal(detail.json().props.order.totals.restante, 171)

    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/pagar',
          headers,
          payload: { descricao: 'Aluguel', valor: '42', vencimento: '2026-10-30' },
        })
      ).statusCode,
      303,
    )
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/agenda',
          headers,
          payload: {
            titulo: 'Revisão',
            clienteId,
            inicio: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          },
        })
      ).statusCode,
      303,
    )
    const dashboard = await app.inject({ method: 'GET', url: '/', headers })
    assert.equal(dashboard.json().props.metrics.aReceber, 171)
    assert.equal(dashboard.json().props.metrics.aPagar, 65)
    assert.equal(dashboard.json().props.appointments.length, 1)
    const payMaterial = await app.inject({
      method: 'POST',
      url: `/pagar/${materialBill.id}/baixar`,
      headers,
    })
    assert.match(String(payMaterial.headers.location), /sucesso=/)
    assert.equal(
      (
        await db.materialServico.findUniqueOrThrow({
          where: { id: materialBill.materialServicoId },
        })
      ).jaPago,
      true,
    )
    const simultaneous = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/servicos/${ordemId}/receber`,
        headers,
        payload: { valor: '100', forma: 'PIX' },
      }),
      app.inject({
        method: 'POST',
        url: `/servicos/${ordemId}/receber`,
        headers,
        payload: { valor: '100', forma: 'PIX' },
      }),
    ])
    assert.equal(
      simultaneous.filter((response) => String(response.headers.location).includes('sucesso'))
        .length,
      1,
    )
    assert.equal(
      (await app.inject({ method: 'GET', url: `/servicos/${ordemId}`, headers })).json().props.order
        .totals.restante,
      71,
    )
    const finalPayment = await app.inject({
      method: 'POST',
      url: `/servicos/${ordemId}/receber`,
      headers,
      payload: { valor: '71', forma: 'PIX' },
    })
    assert.match(String(finalPayment.headers.location), /sucesso=/)
    const receivables = await app.inject({ method: 'GET', url: '/receber', headers })
    assert.equal(receivables.json().props.orders.length, 0)
    assert.equal(receivables.json().props.totalRecebido, 271)
    assert.equal(receivables.json().props.totalGeral, 271)
    const finances = await app.inject({ method: 'GET', url: '/financas?ano=2026&mes=10', headers })
    assert.equal(finances.json().component, 'FinanceOverview')
    assert.equal(finances.json().props.report.annual.faturado, 271)
    assert.equal(finances.json().props.report.annual.gastos, 70)
    assert.equal(finances.json().props.report.annual.lucro, 201)
    assert.equal(finances.json().props.report.period.faturado, 271)
    assert.equal(finances.json().props.report.byClient[0].totals.gastos, 28)
    const clientFinances = await app.inject({
      method: 'GET',
      url: `/financas?ano=2026&mes=10&clienteId=${clienteId}`,
      headers,
    })
    assert.equal(clientFinances.json().props.report.annual.gastos, 28)
  } finally {
    if (userId) {
      await db.agendamento.deleteMany({ where: { usuarioId: userId } })
      await db.contaPagar.deleteMany({ where: { usuarioId: userId } })
      await db.distribuicaoPagamento.deleteMany({ where: { ordemServico: { usuarioId: userId } } })
      await db.pagamentoRecebido.deleteMany({ where: { ordemServico: { usuarioId: userId } } })
      await db.parcelaPrevista.deleteMany({ where: { ordemServico: { usuarioId: userId } } })
      await db.materialServico.deleteMany({
        where: { servico: { ordemServico: { usuarioId: userId } } },
      })
      await db.registroServico.deleteMany({ where: { ordemServico: { usuarioId: userId } } })
      await db.ordemServico.deleteMany({ where: { usuarioId: userId } })
      await db.cliente.deleteMany({ where: { usuarioId: userId } })
      await db.sessaoAcesso.deleteMany({ where: { usuarioId: userId } })
      await db.usuario.delete({ where: { id: userId } })
    }
    await app.close()
    await db.$disconnect()
  }
})
