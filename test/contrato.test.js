import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPACIDADES,
  OBRIGATORIAS,
  OPCIONAIS,
  VERSAO_DO_CONTRATO,
  verificarSistema,
} from '../src/contrato.js'
import { criarSistemaFalso } from '../src/host/falso.js'

describe('o contrato', () => {
  test('nasce com as cinco capacidades que o jogo-sdk já prova, todas obrigatórias', () => {
    assert.deepEqual(OBRIGATORIAS, ['identidade', 'avisar', 'idioma', 'metricas', 'armazenamento'])
    assert.deepEqual(OPCIONAIS, [])
    assert.equal(VERSAO_DO_CONTRATO, 1)
  })

  test('toda capacidade diz por que existe', () => {
    for (const [nome, c] of Object.entries(CAPACIDADES)) {
      assert.ok(typeof c.porque === 'string' && c.porque.length > 40, `${nome} sem motivo`)
    }
  })
})

describe('verificarSistema', () => {
  test('o sistema falso cumpre o contrato', () => {
    assert.deepEqual(verificarSistema(criarSistemaFalso().sistema), { ok: true, problemas: [] })
  })

  test('sistema ausente', () => {
    assert.deepEqual(verificarSistema(null), { ok: false, problemas: ['sistema ausente'] })
  })

  test('outra versão do contrato é recusada, e diz as duas', () => {
    const { sistema } = criarSistemaFalso()
    const r = verificarSistema({ ...sistema, versaoDoContrato: 2 })
    assert.equal(r.ok, false)
    assert.match(r.problemas[0], /contrato 2, o app fala o 1/)
  })

  test('devolve todos os problemas de uma vez, não o primeiro', () => {
    const { sistema } = criarSistemaFalso()
    const incompleto = { ...sistema, avisar: undefined, idioma: { atual: () => 'pt-BR' } }
    delete incompleto.metricas
    const r = verificarSistema(incompleto)
    assert.deepEqual(r.problemas, [
      'falta a capacidade "avisar"',
      'idioma.aoMudar precisa ser função',
      'falta a capacidade "metricas"',
    ])
  })

  test('forma errada numa obrigatória reprova', () => {
    const { sistema } = criarSistemaFalso()
    const r = verificarSistema({ ...sistema, armazenamento: { ler() {}, gravar() {} } })
    assert.deepEqual(r.problemas, ['armazenamento.apagar precisa ser função'])
  })

  test('capacidade exigida que não existe no contrato é problema', () => {
    const { sistema } = criarSistemaFalso()
    const r = verificarSistema(sistema, { exigidas: ['servidor'] })
    assert.deepEqual(r.problemas, ['o app exige "servidor", que não existe no contrato'])
  })
})
