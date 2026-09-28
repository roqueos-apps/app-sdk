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
import { conferirPedidoDeIa } from '../ia.js'
import { criarAbertura } from '../abertura.js'
import { criarTelaCheia } from '../janela.js'
import { armazenamentoDoApp, armazenamentoEmMemoria, storageDoNavegador } from './armazenamento.js'
import { criarColecoesEmMemoria } from './colecoes-em-memoria.js'
import { criarArquivosEmMemoria } from './arquivos-em-memoria.js'
import { criarAnexosEmMemoria } from './anexos-em-memoria.js'

/** Idiomas que correm da direita para a esquerda. */
const RTL = new Set(['ar-AR'])

/**
 * A conta de quem desenvolve. No `yarn dev` a pessoa está "entrada" numa conta
 * local, para a coleção e o salvar em Arquivos funcionarem sem Firebase;
 * `?convidado=1` na URL mostra o app como o convidado vê.
 */
export const CONTA_DE_DESENVOLVIMENTO = Object.freeze({ uid: 'local', nome: 'Você' })

/**
 * @param {{
 *   appId: string, janela?: any, registro?: Pick<Console, 'info'|'debug'>, idioma?: string,
 *   colecoes?: string[], pastas?: string[],
 *   aoTelaCheia?: (ligar: boolean) => boolean | Promise<boolean>,
 * }} opcoes
 * @returns {{ sistema: object, mudarIdioma: (novo: string) => void }}
 */
export function criarSistemaDeDesenvolvimento({
  appId,
  janela = globalThis,
  registro = console,
  idioma,
  colecoes = [],
  pastas = [],
  aoTelaCheia = (ligar) => ligar,
} = {}) {
  if (typeof appId !== 'string' || !/^[a-z][a-z0-9]*$/.test(appId)) {
    throw new TypeError(
      `criarSistemaDeDesenvolvimento precisa do id do app, veio ${JSON.stringify(appId)}`,
    )
  }
  const nav = janela.navigator ?? {}
  const parametro = (nome) => {
    try {
      return new URL(janela.location?.href ?? '').searchParams.get(nome)
    } catch {
      return null
    }
  }
  // `?idioma=ja-JP` na URL vence o idioma do navegador: é o jeito de abrir o app
  // direto em outro idioma, e de mandar o link para quem revisa a tradução.
  const daUrl = parametro('idioma')
  const daUrlLeve = parametro('leve') === '1'
  const quem = parametro('convidado') === '1' ? { uid: null, nome: null } : CONTA_DE_DESENVOLVIMENTO
  // `?abertura={"nota":"x"}` abre o app como se outro pedaço do sistema tivesse pedido.
  const aberta = criarAbertura(
    (() => {
      try {
        return JSON.parse(parametro('abertura') ?? '{}')
      } catch {
        return {}
      }
    })(),
  )
  const storage = storageDoNavegador(janela) ?? armazenamentoEmMemoria()
  const memoria = criarColecoesEmMemoria({
    nomes: colecoes,
    uidAtual: () => quem.uid,
    aoMudarConta: () => () => {},
    // A coleção fica no localStorage, no espaço do app, para continuar depois do F5.
    persistencia: {
      ler: (k) => storage.getItem(`roqueos:${appId}:${k}`),
      gravar: (k, v) => storage.setItem(`roqueos:${appId}:${k}`, v),
    },
  })
  // Os Arquivos ficam em memória: o que a sessão salvou aparece no listar, e salvar
  // também baixa o arquivo, que é o mais perto do Finder que o navegador puro chega.
  const guardados = criarArquivosEmMemoria({
    pastas,
    uidAtual: () => quem.uid,
    aoSalvar(a) {
      const URLs = janela.URL
      if (typeof URLs?.createObjectURL === 'function' && janela.document) {
        const blob =
          typeof a.conteudo === 'string' ? new Blob([a.conteudo], { type: a.tipo }) : a.conteudo
        const url = URLs.createObjectURL(blob)
        const link = janela.document.createElement('a')
        link.href = url
        link.download = a.nome
        link.click?.()
        URLs.revokeObjectURL?.(url)
      }
      registro.info(`[${appId}] salvaria em ${a.pasta}/${a.nome}`)
    },
    aoAbrirPasta: (pasta) => registro.info(`[${appId}] abriria o Finder em ${pasta}`),
  })
  const tela = criarTelaCheia({ aplicar: async (ligar) => Boolean(await aoTelaCheia(ligar)) })
  // Os anexos ficam em memória, como os Arquivos: duram enquanto a página está aberta
  // (fechar e abrir o app de novo os acha) e somem no F5. No RoqueOS eles moram na
  // conta; aqui a imagem de um quadro salvo antes do F5 aparece quebrada, e é isso.
  const deAnexos = criarAnexosEmMemoria({ appId, uidAtual: () => quem.uid })
  let painel = null
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
      atual: () => ({ ...quem }),
      aoMudar: () => () => {},
    },
    // Aqui o aviso é uma linha no console; o fixo sai marcado, para quem
    // desenvolve ver que aquele a pessoa teria de fechar.
    avisar(mensagem, { tipo = 'info', fixo = false, titulo } = {}) {
      registro.info(
        `[${appId}] ${tipo}${fixo ? ' (fixo, até a pessoa fechar)' : ''}: ${titulo ? `${titulo}: ` : ''}${mensagem}`,
      )
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
    armazenamento: armazenamentoDoApp(appId, storage),
    colecoes: { abrir: (nome) => memoria.abrir(nome) },
    // O painel de IA é do RoqueOS, com os agentes da pessoa. Aqui ele é um aviso
    // no lugar certo, para quem desenvolve ver onde o painel apareceria.
    ia: {
      abrirPainel(pedido) {
        const p = conferirPedidoDeIa(pedido)
        painel?.fechar()
        const doc = p.ancora.ownerDocument ?? janela.document
        const caixa = doc.createElement('div')
        caixa.className = 'ros-dev-ia'
        caixa.setAttribute('role', 'dialog')
        const texto = doc.createElement('p')
        texto.textContent =
          'A IA roda dentro do RoqueOS, com os agentes de quem usa. Aqui no yarn dev o painel é só este aviso.'
        const botao = doc.createElement('button')
        botao.textContent = 'Fechar'
        caixa.append(texto, botao)
        p.ancora.appendChild(caixa)
        let aberto = true
        const este = {
          fechar() {
            if (!aberto) return
            aberto = false
            caixa.remove?.()
            if (painel === este) painel = null
            p.aoFechar?.()
          },
        }
        botao.addEventListener('click', () => este.fechar())
        painel = este
        registro.info(`[${appId}] painel de IA (${p.tipo}) aberto`)
        return Object.freeze({ fechar: () => este.fechar() })
      },
    },
    arquivos: guardados.arquivos,
    abertura: aberta.abertura,
    janela: tela.janela,
    anexos: deAnexos.anexos,
  }

  return {
    sistema,
    mudarAbertura: (novo) => aberta.mudar(novo),
    /** O "abrir com" do yarn dev: um arquivo escolhido na barra da janela falsa. */
    abrirCom(arquivo) {
      const entregue = guardados.entregar(arquivo)
      aberta.mudar({ arquivo: entregue })
      return entregue.ref
    },
    /** A pessoa saiu da tela cheia por conta própria. */
    sairDaTelaCheia: () => tela.mudar(false),
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
.ros-dev-janela--cheia{position:fixed;inset:0;width:auto!important;height:auto!important;border-radius:0;z-index:100}
.ros-dev-janela--cheia .ros-dev-barra{display:none}
.ros-dev-ia{position:absolute;inset:auto 12px 12px 12px;z-index:10;padding:12px 14px;border-radius:10px;
  background:#262b35;color:#e9eaed;font:13px/1.4 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.ros-dev-ia p{margin:0 0 8px}
`

/**
 * Monta o app numa janela falsa do RoqueOS, no `document` da página.
 * @param {{ id: string, mount: Function }} app o que `definirApp` devolve
 * @param {{ manifesto: object, alvo?: any, janela?: any, registro?: object }} opcoes
 * @returns {{ sistema: object, montagem: object, mudarIdioma: Function }}
 */
export function montarNaJanelaFalsa(app, { manifesto, alvo, janela = globalThis, registro } = {}) {
  const doc = janela.document
  // A moldura existe antes do sistema: é ela que a tela cheia do yarn dev estica.
  const moldura = doc.createElement('div')
  const { sistema, mudarIdioma, abrirCom, sairDaTelaCheia } = criarSistemaDeDesenvolvimento({
    appId: app.id,
    janela,
    registro,
    colecoes: manifesto?.colecoes ?? [],
    pastas: manifesto?.pastas ?? [],
    aoTelaCheia(ligar) {
      moldura.classList.toggle('ros-dev-janela--cheia', ligar)
      return ligar
    },
  })
  const estilo = doc.createElement('style')
  estilo.textContent = ESTILO_DA_JANELA
  doc.head.appendChild(estilo)

  const mesa = alvo ?? doc.body
  mesa.classList.add('ros-dev-mesa')
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
  // O app que abre arquivo ganha um "Abrir arquivo" na barra: é o "abrir com" do Finder.
  if (Array.isArray(manifesto?.abre) && manifesto.abre.length) {
    const escolher = doc.createElement('input')
    escolher.type = 'file'
    escolher.accept = manifesto.abre.join(',')
    escolher.setAttribute('aria-label', 'Abrir arquivo com o app')
    escolher.addEventListener('change', () => {
      const f = escolher.files?.[0]
      if (f) abrirCom({ nome: f.name, tipo: f.type || 'application/octet-stream', conteudo: f })
    })
    barra.insertBefore(escolher, seletor)
  }
  // Esc sai da tela cheia, como no RoqueOS.
  janela.addEventListener?.('keydown', (e) => {
    if (e.key === 'Escape' && sistema.janela.emTelaCheia()) {
      moldura.classList.remove('ros-dev-janela--cheia')
      sairDaTelaCheia()
    }
  })

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
