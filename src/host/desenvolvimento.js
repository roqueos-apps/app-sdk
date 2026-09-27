// SISTEMA DE DESENVOLVIMENTO: o app rodando sozinho, sem o RoqueOS em volta.
//
// É o que roda no `yarn dev` de um repo de app, e o que deixa alguém de fora
// contribuir sem conta, sem Firebase de produção e sem o código do RoqueOS.
// Tudo aqui usa só o navegador: localStorage no lugar do armazenamento do
// sistema, console no lugar dos avisos e das métricas.
//
// `montarNaJanelaFalsa` põe o app numa janela parecida com a do RoqueOS, com o
// tamanho do `app.json`, o nome no idioma atual e um seletor dos dez idiomas: é
// assim que quem contribui vê o árabe da direita para a esquerda e o texto longo
// do alemão sem instalar o RoqueOS.

import { VERSAO_DO_CONTRATO } from '../contrato.js'
import { IDIOMAS, normalizarIdioma } from '../idiomas.js'
import { armazenamentoDoApp, armazenamentoEmMemoria, storageDoNavegador } from './armazenamento.js'

/** Idiomas que correm da direita para a esquerda. */
const RTL = new Set(['ar-AR'])

/**
 * @param {{ appId: string, janela?: any, registro?: Pick<Console, 'info'|'debug'>, idioma?: string }} opcoes
 * @returns {{ sistema: object, mudarIdioma: (novo: string) => void }}
 */
export function criarSistemaDeDesenvolvimento({
  appId,
  janela = globalThis,
  registro = console,
  idioma,
} = {}) {
  if (typeof appId !== 'string' || !/^[a-z][a-z0-9]*$/.test(appId)) {
    throw new TypeError(
      `criarSistemaDeDesenvolvimento precisa do id do app, veio ${JSON.stringify(appId)}`,
    )
  }
  const nav = janela.navigator ?? {}
  // `?idioma=ja-JP` na URL vence o idioma do navegador: é o jeito de abrir o app
  // direto em outro idioma, e de mandar o link para quem revisa a tradução.
  const daUrl = (() => {
    try {
      return new URL(janela.location?.href ?? '').searchParams.get('idioma')
    } catch {
      return null
    }
  })()
  const daUrlLeve = (() => {
    try {
      return new URL(janela.location?.href ?? '').searchParams.get('leve') === '1'
    } catch {
      return false
    }
  })()
  let idiomaAtual = normalizarIdioma(idioma ?? daUrl ?? nav.language)
  const ouvintesDeIdioma = new Set()
  const avisarIdioma = () => {
    for (const fn of [...ouvintesDeIdioma]) fn(idiomaAtual)
  }
  if (typeof janela.addEventListener === 'function') {
    janela.addEventListener('languagechange', () => {
      idiomaAtual = normalizarIdioma(nav.language)
      avisarIdioma()
    })
  }

  const sistema = {
    versaoDoContrato: VERSAO_DO_CONTRATO,
    identidade: {
      atual: () => ({ uid: null, nome: null }),
      aoMudar: () => () => {},
    },
    // Aqui o aviso é uma linha no console; o fixo sai marcado, para quem
    // desenvolve ver que aquele a pessoa teria de fechar.
    avisar(mensagem, { tipo = 'info', fixo = false } = {}) {
      registro.info(`[${appId}] ${tipo}${fixo ? ' (fixo, até a pessoa fechar)' : ''}: ${mensagem}`)
    },
    idioma: {
      atual: () => idiomaAtual,
      aoMudar(fn) {
        ouvintesDeIdioma.add(fn)
        return () => ouvintesDeIdioma.delete(fn)
      },
    },
    // O mesmo critério do jogo-sdk: tela de toque ou pouca memória pede o perfil leve.
    // `?leve=1` na URL força, para quem desenvolve ver o app como o aparelho fraco vê.
    desempenho: {
      modoLeve() {
        if (daUrlLeve) return true
        const toque = janela.matchMedia?.('(pointer: coarse)')?.matches === true
        const memoriaCurta = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4
        return toque || memoriaCurta
      },
    },
    metricas: {
      evento(nome, dados = {}) {
        registro.debug(`[${appId}] evento ${nome}`, dados)
      },
    },
    armazenamento: armazenamentoDoApp(
      appId,
      storageDoNavegador(janela) ?? armazenamentoEmMemoria(),
    ),
  }

  return {
    sistema,
    mudarIdioma(novo) {
      idiomaAtual = normalizarIdioma(novo)
      avisarIdioma()
    },
  }
}

const ESTILO_DA_JANELA = `
.ros-dev-mesa{min-height:100vh;margin:0;display:grid;place-items:center;
  background:radial-gradient(circle at 30% 20%,#2b3a55,#11151d 70%);font-family:system-ui,sans-serif}
.ros-dev-janela{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;resize:both;
  background:#1d2129;box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}
.ros-dev-barra{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;
  background:#262b35;color:#e9eaed;font-size:13px;user-select:none}
.ros-dev-barra b{flex:1;font-weight:600;text-align:center}
.ros-dev-barra select{background:#1d2129;color:#e9eaed;border:1px solid #3a4150;border-radius:6px;font-size:12px}
.ros-dev-palco{position:relative;flex:1;min-height:0}
`

/**
 * Monta o app numa janela falsa do RoqueOS, no `document` da página.
 * @param {{ id: string, mount: Function }} app o que `definirApp` devolve
 * @param {{ manifesto: object, alvo?: any, janela?: any, registro?: object }} opcoes
 * @returns {{ sistema: object, montagem: object, mudarIdioma: Function }}
 */
export function montarNaJanelaFalsa(app, { manifesto, alvo, janela = globalThis, registro } = {}) {
  const doc = janela.document
  const { sistema, mudarIdioma } = criarSistemaDeDesenvolvimento({
    appId: app.id,
    janela,
    registro,
  })
  const estilo = doc.createElement('style')
  estilo.textContent = ESTILO_DA_JANELA
  doc.head.appendChild(estilo)

  const mesa = alvo ?? doc.body
  mesa.classList.add('ros-dev-mesa')
  const moldura = doc.createElement('div')
  moldura.className = 'ros-dev-janela'
  const j = manifesto?.janela ?? {}
  moldura.style.width = `${j.largura ?? 480}px`
  moldura.style.height = `${(j.altura ?? 640) + 36}px`
  moldura.style.minWidth = `${j.minLargura ?? 240}px`
  moldura.style.minHeight = `${(j.minAltura ?? 240) + 36}px`

  const barra = doc.createElement('div')
  barra.className = 'ros-dev-barra'
  const titulo = doc.createElement('b')
  const seletor = doc.createElement('select')
  seletor.setAttribute('aria-label', 'Idioma')
  for (const idioma of IDIOMAS) {
    const opcao = doc.createElement('option')
    opcao.value = idioma
    opcao.textContent = idioma
    seletor.appendChild(opcao)
  }
  barra.append(titulo, seletor)

  const palco = doc.createElement('div')
  palco.className = 'ros-dev-palco'
  moldura.append(barra, palco)
  mesa.appendChild(moldura)

  const aplicarIdioma = (idioma) => {
    titulo.textContent = manifesto?.nome?.[idioma] ?? manifesto?.nome?.['pt-BR'] ?? app.id
    seletor.value = idioma
    // Como o RoqueOS faz: a direção vem do idioma, no documento inteiro.
    doc.documentElement.lang = idioma
    doc.documentElement.dir = RTL.has(idioma) ? 'rtl' : 'ltr'
  }
  aplicarIdioma(sistema.idioma.atual())
  sistema.idioma.aoMudar(aplicarIdioma)
  seletor.addEventListener('change', () => mudarIdioma(seletor.value))

  const montagem = app.mount(palco, sistema, { windowId: `dev-${app.id}`, ativo: true })
  // Trocar de aba ou de janela é o equivalente a perder o foco no RoqueOS.
  janela.addEventListener?.('focus', () => montagem.ativar(true))
  janela.addEventListener?.('blur', () => montagem.ativar(false))
  return { sistema, montagem, mudarIdioma }
}
