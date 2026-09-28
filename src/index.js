// A porta de entrada do SDK de apps. Um app é um objeto com `mount`, criado por
// `definirApp`, e é assim que ele entra no RoqueOS, no sistema de
// desenvolvimento e no teste, sem saber em qual dos três está.

import { VERSAO_DO_CONTRATO, verificarSistema } from './contrato.js'

export {
  VERSAO_DO_CONTRATO,
  CAPACIDADES,
  OBRIGATORIAS,
  OPCIONAIS,
  TIPOS_DE_AVISO,
  verificarSistema,
} from './contrato.js'
export { IDIOMAS, IDIOMA_CANONICO, IDIOMA_DE_RECUO, normalizarIdioma } from './idiomas.js'
export { emModoE2E, estadoE2E } from './e2e.js'
export { validarManifesto, CATEGORIAS, CAMADAS } from './manifesto.js'
export { VARIAVEIS_DO_SISTEMA } from './variaveis.js'
// As peças das opcionais (0.2.0), para os três sistemas conferirem igual.
export { ErroDoSistema, CODIGOS_DE_ERRO } from './erros.js'
export { CARIMBOS, conferirCampos, conferirIdDeDocumento } from './colecoes.js'
export { PASTAS_DE_ARQUIVOS, conferirArquivo } from './arquivos.js'
export { TIPOS_DE_IA, conferirPedidoDeIa } from './ia.js'
export { criarAbertura } from './abertura.js'

const ID = /^[a-z][a-z0-9]*$/

/**
 * @typedef {object} Montagem
 * @property {(ativo: boolean) => void} [ativar] a janela ganhou ou perdeu o foco
 * @property {() => void} desmontar solta tudo: app Vue, listener, timer, observador
 */

/**
 * Define um app.
 *
 * `montar(el, sistema, { windowId, ativo })` recebe o elemento onde o app vive
 * (100% por 100%; o app mede o próprio tamanho) e devolve a montagem. O app cria
 * o próprio app Vue (ou o que for) dentro de `el`: nenhuma store, nenhum plugin e
 * nenhum estilo global do RoqueOS chega lá dentro, e é por isso que ele roda
 * igual no RoqueOS, sozinho no `yarn dev` do repo e no teste.
 *
 * @param {{ id: string, capacidades?: string[], montar: Function }} definicao
 */
export function definirApp({ id, capacidades = [], montar } = {}) {
  if (typeof id !== 'string' || !ID.test(id)) {
    throw new TypeError(
      `id de app inválido: ${JSON.stringify(id)} (minúsculas e dígitos, começando por letra)`,
    )
  }
  if (typeof montar !== 'function') {
    throw new TypeError(`[${id}] definirApp precisa de montar(el, sistema, opcoes)`)
  }
  if (!Array.isArray(capacidades)) {
    throw new TypeError(`[${id}] capacidades é uma lista de nomes`)
  }
  const exigidas = Object.freeze([...capacidades])

  return Object.freeze({
    id,
    versaoDoContrato: VERSAO_DO_CONTRATO,
    capacidades: exigidas,
    /**
     * @param {object} el
     * @param {object} sistema
     * @param {{ windowId?: string | null, ativo?: boolean }} [opcoes]
     * @returns {Required<Montagem>}
     */
    mount(el, sistema, opcoes = {}) {
      if (!el || typeof el !== 'object') {
        throw new TypeError(`[${id}] mount precisa do elemento onde o app vive`)
      }
      const { ok, problemas } = verificarSistema(sistema, { exigidas })
      if (!ok) throw new Error(`[${id}] o sistema não cumpre o contrato: ${problemas.join('; ')}`)

      const montagem = montar(el, sistema, {
        windowId: opcoes.windowId ?? null,
        ativo: opcoes.ativo ?? true,
      })
      if (!montagem || typeof montagem.desmontar !== 'function') {
        throw new TypeError(`[${id}] montar precisa devolver { ativar, desmontar }`)
      }

      let desmontado = false
      return Object.freeze({
        ativar(ativo) {
          if (desmontado || typeof montagem.ativar !== 'function') return
          montagem.ativar(Boolean(ativo))
        },
        // Desmontar duas vezes acontece de verdade: a janela fecha e o
        // componente em volta desmonta logo depois. A segunda vez não faz nada.
        desmontar() {
          if (desmontado) return
          desmontado = true
          montagem.desmontar()
        },
      })
    },
  })
}
