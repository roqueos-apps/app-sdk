import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { definirApp, VERSAO_DO_CONTRATO } from '../src/index.js'
import { criarSistemaFalso } from '../src/host/falso.js'

const el = {}

describe('definirApp', () => {
  test('id fora do formato é recusado na hora, não no mount', () => {
    for (const id of ['', 'Calculadora', '1app', 'minha-calc', undefined]) {
      assert.throws(() => definirApp({ id, montar: () => ({ desmontar() {} }) }), TypeError)
    }
  })

  test('sem montar, ou com capacidades que não são lista, é recusado', () => {
    assert.throws(() => definirApp({ id: 'calc' }), /montar\(el, sistema, opcoes\)/)
    assert.throws(
      () => definirApp({ id: 'calc', capacidades: 'ia', montar: () => ({ desmontar() {} }) }),
      /lista de nomes/,
    )
  })

  test('o app definido diz o id, a versão do contrato e o que exige, e não muda', () => {
    const app = definirApp({ id: 'calc', montar: () => ({ desmontar() {} }) })
    assert.equal(app.id, 'calc')
    assert.equal(app.versaoDoContrato, VERSAO_DO_CONTRATO)
    assert.deepEqual(app.capacidades, [])
    assert.ok(Object.isFrozen(app) && Object.isFrozen(app.capacidades))
  })
})

describe('mount', () => {
  test('passa o elemento, o sistema e as opções com os padrões', () => {
    let recebido
    const app = definirApp({
      id: 'calc',
      montar(...args) {
        recebido = args
        return { desmontar() {} }
      },
    })
    const { sistema } = criarSistemaFalso()
    app.mount(el, sistema)
    assert.equal(recebido[0], el)
    assert.equal(recebido[1], sistema)
    assert.deepEqual(recebido[2], { windowId: null, ativo: true })
    app.mount(el, sistema, { windowId: 'w1', ativo: false })
    assert.deepEqual(recebido[2], { windowId: 'w1', ativo: false })
  })

  test('sem elemento, lança antes de montar', () => {
    const app = definirApp({ id: 'calc', montar: () => ({ desmontar() {} }) })
    assert.throws(() => app.mount(null, criarSistemaFalso().sistema), /elemento onde o app vive/)
  })

  test('sistema incompleto é recusado com a lista inteira, e o app não chega a montar', () => {
    let montou = false
    const app = definirApp({
      id: 'calc',
      montar() {
        montou = true
        return { desmontar() {} }
      },
    })
    const { sistema } = criarSistemaFalso()
    assert.throws(
      () => app.mount(el, { ...sistema, avisar: undefined, metricas: undefined }),
      /\[calc\] o sistema não cumpre o contrato: falta a capacidade "avisar"; falta a capacidade "metricas"/,
    )
    assert.equal(montou, false)
  })

  test('montar que não devolve desmontar é defeito do app, e diz qual', () => {
    const app = definirApp({ id: 'calc', montar: () => ({}) })
    assert.throws(() => app.mount(el, criarSistemaFalso().sistema), /\[calc\] montar precisa/)
  })

  test('ativar chega como booleano, e é opcional no app', () => {
    const vistos = []
    const com = definirApp({
      id: 'calc',
      montar: () => ({ ativar: (a) => vistos.push(a), desmontar() {} }),
    }).mount(el, criarSistemaFalso().sistema)
    com.ativar(0)
    com.ativar('sim')
    assert.deepEqual(vistos, [false, true])
    const sem = definirApp({ id: 'calc', montar: () => ({ desmontar() {} }) }).mount(
      el,
      criarSistemaFalso().sistema,
    )
    assert.doesNotThrow(() => sem.ativar(true))
  })

  test('desmontar duas vezes solta uma vez só, e ativar depois não chega ao app', () => {
    let desmontagens = 0
    let ativacoes = 0
    const m = definirApp({
      id: 'calc',
      montar: () => ({ ativar: () => ativacoes++, desmontar: () => desmontagens++ }),
    }).mount(el, criarSistemaFalso().sistema)
    m.desmontar()
    m.desmontar()
    m.ativar(true)
    assert.equal(desmontagens, 1)
    assert.equal(ativacoes, 0)
  })
})
