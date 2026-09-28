// SISTEMA FALSO: o contrato inteiro em memória, para o teste do app.
//
// O teste monta o app com este sistema e confere o que ele fez: o que avisou,
// o que mediu, o que gravou, que arquivo salvou, que painel de IA abriu. E
// consegue mexer no mundo em volta do jeito que o RoqueOS mexe: trocar o idioma
// com a janela aberta, entrar e sair da conta, abrir a janela de novo com outro
// pedido, a pessoa aplicar o resultado da IA ou fechar o painel.
//
// As opcionais estão todas aqui, com a mesma semântica do sistema do RoqueOS,
// para o teste do app pegar o erro que o RoqueOS pegaria (gravar sem conta,
// coleção fora do mapa, campo de carimbo mandado pelo app).

import { VERSAO_DO_CONTRATO } from '../contrato.js'
import { IDIOMA_CANONICO, normalizarIdioma } from '../idiomas.js'
import { ErroDoSistema } from '../erros.js'
import { conferirArquivo } from '../arquivos.js'
import { conferirPedidoDeIa } from '../ia.js'
import { criarAbertura } from '../abertura.js'
import { armazenamentoDoApp, armazenamentoEmMemoria } from './armazenamento.js'
import { criarColecoesEmMemoria } from './colecoes-em-memoria.js'

/**
 * @param {{
 *   appId?: string, idioma?: string, identidade?: { uid: string|null, nome: string|null },
 *   modoLeve?: boolean, colecoes?: string[], abertura?: object, agora?: () => number,
 * }} [opcoes]
 */
export function criarSistemaFalso({
  appId = 'teste',
  idioma = IDIOMA_CANONICO,
  identidade = { uid: null, nome: null },
  modoLeve = false,
  colecoes = [],
  abertura = {},
  agora = () => Date.now(),
} = {}) {
  let idiomaAtual = normalizarIdioma(idioma)
  let quem = { ...identidade }
  const ouvintesDeIdioma = new Set()
  const ouvintesDeIdentidade = new Set()
  const storage = armazenamentoEmMemoria()
  const registro = { avisos: [], eventos: [], arquivos: [], paineis: [] }

  const ouvir = (conjunto) => (fn) => {
    conjunto.add(fn)
    return () => conjunto.delete(fn)
  }

  // A conta muda por dentro, e não pelo `identidade.aoMudar`, para as coleções não
  // contarem como ouvinte do app no teste do desmontar.
  let avisarConta = null
  const memoria = criarColecoesEmMemoria({
    nomes: colecoes,
    uidAtual: () => quem.uid,
    aoMudarConta: (fn) => {
      avisarConta = fn
      return () => (avisarConta = null)
    },
    agora,
  })
  const aberta = criarAbertura(abertura)
  let painel = null

  function fecharPainel() {
    const atual = painel
    if (!atual) return
    painel = null
    atual.entrada.aberto = false
    atual.pedido.aoFechar?.()
  }

  const sistema = {
    versaoDoContrato: VERSAO_DO_CONTRATO,
    identidade: {
      atual: () => ({ ...quem }),
      aoMudar: ouvir(ouvintesDeIdentidade),
    },
    avisar(mensagem, { tipo = 'info', fixo = false, titulo } = {}) {
      registro.avisos.push({
        mensagem: String(mensagem),
        tipo,
        fixo,
        ...(titulo !== undefined ? { titulo: String(titulo) } : {}),
      })
    },
    idioma: {
      atual: () => idiomaAtual,
      aoMudar: ouvir(ouvintesDeIdioma),
    },
    desempenho: {
      modoLeve: () => modoLeve,
    },
    metricas: {
      evento(nome, dados = {}) {
        registro.eventos.push({ nome, dados })
      },
    },
    armazenamento: armazenamentoDoApp(appId, storage),
    colecoes: { abrir: (nome) => memoria.abrir(nome) },
    ia: {
      abrirPainel(pedido) {
        const p = conferirPedidoDeIa(pedido)
        // Um painel por janela, como no RoqueOS: o novo fecha o anterior.
        fecharPainel()
        const entrada = {
          tipo: p.tipo,
          acento: p.acento ?? null,
          titulo: p.titulo ?? null,
          aplica: typeof p.aplicar === 'function',
          aberto: true,
        }
        registro.paineis.push(entrada)
        const meu = { entrada, pedido: p }
        painel = meu
        return Object.freeze({
          fechar: () => {
            if (painel === meu) fecharPainel()
          },
        })
      },
    },
    arquivos: {
      async salvar(pedido) {
        const a = conferirArquivo(pedido)
        if (!quem.uid) throw new ErroDoSistema('sem-conta')
        registro.arquivos.push(a)
        return { nome: a.nome, pasta: a.pasta }
      },
    },
    abertura: aberta.abertura,
  }

  return {
    sistema,
    /** O que o app fez: `avisos`, `eventos`, `arquivos` e `paineis`, na ordem. */
    registro,
    /** O Storage por baixo, com as chaves já no formato roqueos:<app>:<chave>. */
    storage,
    /** As coleções por baixo: `semear(nome, uid, docs)` e `guardado(nome, uid)`. */
    colecoes: memoria,
    /** Troca o idioma como o RoqueOS troca: com a janela aberta. */
    mudarIdioma(novo) {
      idiomaAtual = normalizarIdioma(novo)
      for (const fn of [...ouvintesDeIdioma]) fn(idiomaAtual)
    },
    /** Entra ou sai da conta: `{ uid, nome }`, ou `{ uid: null, nome: null }`. */
    mudarIdentidade(nova) {
      quem = { uid: nova?.uid ?? null, nome: nova?.nome ?? null }
      for (const fn of [...ouvintesDeIdentidade]) fn({ ...quem })
      avisarConta?.()
    },
    /** A janela aberta é chamada de novo, com outro pedido. */
    mudarAbertura: (novo) => aberta.mudar(novo),
    /** O painel de IA aberto agora, do jeito que a pessoa mexe nele. */
    ia: {
      aberto: () => (painel ? { ...painel.entrada } : null),
      /** O conteúdo que o app entrega, lido como o painel lê. */
      contexto: async () => (painel ? painel.pedido.contexto() : null),
      /** A pessoa aplica um resultado: chega ao `aplicar` do app. */
      aplicar(texto) {
        if (!painel?.pedido.aplicar) throw new Error('nenhum painel aberto que aplica')
        painel.pedido.aplicar(String(texto))
      },
      /** A pessoa fecha o painel. */
      fechar: () => fecharPainel(),
    },
    /** Quantos ouvintes ainda estão presos: o teste do desmontar confere que voltou a zero. */
    ouvintesVivos: () =>
      ouvintesDeIdioma.size +
      ouvintesDeIdentidade.size +
      memoria.ouvintesVivos() +
      aberta.ouvintesVivos() +
      (painel ? 1 : 0),
  }
}
