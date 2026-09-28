import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { verificarSistema } from '../src/contrato.js'
import { definirApp } from '../src/index.js'
import { criarSistemaFalso } from '../src/host/falso.js'
import { criarSistemaDeDesenvolvimento, montarNaJanelaFalsa } from '../src/host/desenvolvimento.js'
import { armazenamentoDoApp, chaveDoApp } from '../src/host/armazenamento.js'
import { janelaFalsa } from './janela-falsa.js'
import contador from './fixtures/app-ok/src/index.js'

const silencioso = { info() {}, debug() {} }

describe('armazenamento', () => {
  test('o espaço é roqueos:<app>:<chave>, o mesmo que os apps já usavam', () => {
    assert.equal(chaveDoApp('calculator', 'historico'), 'roqueos:calculator:historico')
  })

  test('Storage que lança vira null e false, e o app não morre', () => {
    const quebra = () => {
      throw new Error('QuotaExceededError')
    }
    const a = armazenamentoDoApp('x', { getItem: quebra, setItem: quebra, removeItem: quebra })
    assert.equal(a.ler('k'), null)
    assert.equal(a.gravar('k', 1), false)
    assert.equal(a.apagar('k'), false)
  })
})

describe('sistema falso', () => {
  test('cumpre o contrato, registra o que o app fez e troca idioma e conta', () => {
    const f = criarSistemaFalso({ appId: 'contador', idioma: 'en' })
    assert.equal(verificarSistema(f.sistema).ok, true)
    assert.equal(f.sistema.idioma.atual(), 'en-US')
    const idiomas = []
    const parar = f.sistema.idioma.aoMudar((i) => idiomas.push(i))
    f.mudarIdioma('ar')
    parar()
    f.mudarIdioma('ja-JP')
    assert.deepEqual(idiomas, ['ar-AR'])
    f.sistema.avisar('salvo', { tipo: 'sucesso' })
    f.sistema.metricas.evento('abriu', { de: 'teste' })
    assert.deepEqual(f.registro, {
      avisos: [{ mensagem: 'salvo', tipo: 'sucesso', fixo: false }],
      eventos: [{ nome: 'abriu', dados: { de: 'teste' } }],
      arquivos: [],
      paineis: [],
      pastasAbertas: [],
      telaCheia: [],
    })
    f.mudarIdentidade({ uid: 'u1', nome: 'Ana' })
    assert.deepEqual(f.sistema.identidade.atual(), { uid: 'u1', nome: 'Ana' })
  })

  test('o app de teste solta o ouvinte de idioma ao desmontar', () => {
    const f = criarSistemaFalso({ appId: 'contador' })
    const el = { textContent: '' }
    f.storage.setItem('roqueos:contador:n', '41')
    const m = contador.mount(el, f.sistema)
    assert.equal(el.textContent, '41')
    assert.equal(f.ouvintesVivos(), 1)
    m.desmontar()
    assert.equal(f.ouvintesVivos(), 0)
  })
})

describe('sistema de desenvolvimento', () => {
  test('cumpre o contrato e usa o localStorage no espaço do app', () => {
    const janela = janelaFalsa()
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela,
      registro: silencioso,
    })
    assert.equal(verificarSistema(sistema).ok, true)
    sistema.armazenamento.gravar('x', 7)
    assert.equal(janela.dados.get('roqueos:calc:x'), '7')
  })

  test('sem localStorage (modo privado), cai na memória e continua funcionando', () => {
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa({ storageQuebrado: true }),
      registro: silencioso,
    })
    assert.equal(sistema.armazenamento.gravar('x', 1), true)
    assert.equal(sistema.armazenamento.ler('x'), '1')
  })

  test('o idioma vem do navegador, e ?idioma= na URL vence', () => {
    const doNavegador = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa({ language: 'pt-PT' }),
      registro: silencioso,
    })
    assert.equal(doNavegador.sistema.idioma.atual(), 'pt-BR')
    const daUrl = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa({ href: 'http://localhost:5173/?idioma=ja-JP' }),
      registro: silencioso,
    })
    assert.equal(daUrl.sistema.idioma.atual(), 'ja-JP')
  })

  test('languagechange do navegador chega a quem ouve', () => {
    const janela = janelaFalsa({ language: 'en-US' })
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela,
      registro: silencioso,
    })
    const vistos = []
    sistema.idioma.aoMudar((i) => vistos.push(i))
    janela.navigator.language = 'de'
    janela.emitir('languagechange')
    assert.deepEqual(vistos, ['de-DE'])
  })

  test('aviso e evento vão para o console, com o id do app', () => {
    const linhas = []
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa(),
      registro: { info: (l) => linhas.push(l), debug: (l) => linhas.push(l) },
    })
    sistema.avisar('não salvou', { tipo: 'erro', fixo: true })
    sistema.metricas.evento('calculou')
    assert.deepEqual(linhas, [
      '[calc] erro (fixo, até a pessoa fechar): não salvou',
      '[calc] evento calculou',
    ])
  })

  test('modo leve: toque ou pouca memória, e ?leve=1 força', () => {
    const forte = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa(),
      registro: silencioso,
    })
    assert.equal(forte.sistema.desempenho.modoLeve(), false)
    const toque = janelaFalsa()
    toque.matchMedia = (q) => ({ matches: q === '(pointer: coarse)' })
    assert.equal(
      criarSistemaDeDesenvolvimento({
        appId: 'calc',
        janela: toque,
        registro: silencioso,
      }).sistema.desempenho.modoLeve(),
      true,
    )
    const forcado = criarSistemaDeDesenvolvimento({
      appId: 'calc',
      janela: janelaFalsa({ href: 'http://localhost:5173/?leve=1' }),
      registro: silencioso,
    })
    assert.equal(forcado.sistema.desempenho.modoLeve(), true)
    assert.equal(criarSistemaFalso({ modoLeve: true }).sistema.desempenho.modoLeve(), true)
  })

  test('id fora do formato é recusado', () => {
    assert.throws(() => criarSistemaDeDesenvolvimento({ appId: 'Calc' }), TypeError)
  })
})

describe('janela falsa', () => {
  const manifesto = {
    nome: { 'pt-BR': 'Contador', 'en-US': 'Counter', 'ar-AR': 'عدّاد' },
    janela: { largura: 320, altura: 240, minLargura: 240, minAltura: 200 },
  }

  test('monta o app no palco, com o tamanho do manifesto e o nome no idioma', () => {
    const janela = janelaFalsa({ language: 'en-US' })
    const { montagem } = montarNaJanelaFalsa(contador, { manifesto, janela, registro: silencioso })
    const moldura = janela.document.body.filhos[0]
    assert.equal(moldura.className, 'ros-dev-janela')
    assert.equal(moldura.style.width, '320px')
    assert.equal(moldura.style.height, '276px')
    const [barra, palco] = moldura.filhos
    assert.equal(barra.filhos[0].textContent, 'Counter')
    assert.equal(palco.textContent, '0')
    assert.equal(janela.document.documentElement.lang, 'en-US')
    montagem.desmontar()
  })

  test('o seletor troca o idioma com a janela aberta, e o árabe vira RTL', () => {
    const janela = janelaFalsa({ language: 'pt-BR' })
    montarNaJanelaFalsa(contador, { manifesto, janela, registro: silencioso })
    const [barra] = janela.document.body.filhos[0].filhos
    const [titulo, seletor] = barra.filhos
    assert.equal(seletor.filhos.length, 10)
    seletor.value = 'ar-AR'
    seletor.emitir('change')
    assert.equal(titulo.textContent, 'عدّاد')
    assert.equal(janela.document.documentElement.dir, 'rtl')
    seletor.value = 'pt-BR'
    seletor.emitir('change')
    assert.equal(janela.document.documentElement.dir, 'ltr')
  })

  test('foco e perda de foco da aba chegam ao app como ativar', () => {
    const vistos = []
    const app = definirApp({
      id: 'foco',
      montar: () => ({ ativar: (a) => vistos.push(a), desmontar() {} }),
    })
    const janela = janelaFalsa()
    montarNaJanelaFalsa(app, { manifesto, janela, registro: silencioso })
    janela.emitir('blur')
    janela.emitir('focus')
    assert.deepEqual(vistos, [false, true])
  })
})
