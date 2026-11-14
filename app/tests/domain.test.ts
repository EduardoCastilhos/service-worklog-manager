// Confere os cálculos monetários sem depender do servidor ou do banco.
import test from 'node:test'
import assert from 'node:assert/strict'
import { decimal, totalOrdem, totalRegistro } from '../src/domain.js'

test('calcula mão de obra, deslocamentos, itens e saldo em centavos', () => {
  const first = {
    minutosTrabalhados: 90,
    valorHora: decimal(8000),
    numeroDeslocamentos: 2,
    valorDeslocamento: decimal(2500),
    custoDeslocamento: decimal(1200),
    desconto: decimal(0),
    acrescimo: decimal(0),
    materiaisServicos: [
      {
        quantidadeMaterial: decimal(200),
        valorGastoUnidade: decimal(1000),
        valorCobradoUnidade: decimal(1800),
      },
    ],
  }
  assert.deepEqual(totalRegistro(first), {
    maoDeObra: 12000,
    deslocamento: 5000,
    itensCobrados: 3600,
    gastos: 3200,
    total: 20600,
  })
  const second = {
    ...first,
    minutosTrabalhados: 30,
    numeroDeslocamentos: 1,
    custoDeslocamento: decimal(0),
    materiaisServicos: [],
  }
  const totals = totalOrdem({
    desconto: decimal(1000),
    acrescimo: decimal(0),
    registrosServico: [first, second],
    pagamentosRecebidos: [
      { montanteRecebido: decimal(10000), dataAnulacaoLancamentoIncorreto: null },
    ],
  })
  assert.equal(totals.total, 26100)
  assert.equal(totals.restante, 16100)
})
