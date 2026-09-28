// A capacidade `colecoes` em memória, com a mesma semântica do sistema do
// RoqueOS: carimbo pelo sistema, `atualizar` por campo, lista que segue a conta,
// gravar sem conta rejeita. É o que o sistema falso usa no teste do app e o que o
// sistema de desenvolvimento usa no `yarn dev` (lá, com o localStorage por baixo,
// para a nota continuar depois do F5).

import { ErroDoSistema } from '../erros.js'
import { conferirCampos, conferirIdDeDocumento } from '../colecoes.js'

/**
 * @param {{
 *   nomes: string[],
 *   uidAtual: () => string | null,
 *   aoMudarConta: (fn: () => void) => () => void,
 *   agora?: () => number,
 *   persistencia?: { ler(chave: string): string | null, gravar(chave: string, valor: string): void },
 * }} opcoes
 */
export function criarColecoesEmMemoria({
  nomes,
  uidAtual,
  aoMudarConta,
  agora = () => Date.now(),
  persistencia = null,
}) {
  const conhecidas = new Set(nomes)
  /** `${uid}/${nome}` → Map<id, documento guardado> */
  const bancos = new Map()
  /** nome → Set<{ aoMudar, aoErrar }> */
  const ouvintes = new Map()

  const chave = (uid, nome) => `${uid}/${nome}`
  function banco(uid, nome) {
    const k = chave(uid, nome)
    if (!bancos.has(k)) {
      let inicial = []
      try {
        inicial = JSON.parse(persistencia?.ler(`colecao:${k}`) ?? '[]')
      } catch {
        inicial = []
      }
      bancos.set(k, new Map(inicial.map((d) => [d.id, d])))
    }
    return bancos.get(k)
  }
  const entregar = (d) => ({
    ...JSON.parse(JSON.stringify(d)),
    criadoEm: d.criadoEm ?? null,
    atualizadoEm: d.atualizadoEm ?? null,
  })
  const lista = (nome) => {
    const uid = uidAtual()
    return uid ? [...banco(uid, nome).values()].map(entregar) : []
  }
  const avisar = (nome) => {
    const docs = lista(nome)
    for (const o of [...(ouvintes.get(nome) ?? [])]) o.aoMudar(docs.map((d) => ({ ...d })))
  }
  const gravado = (uid, nome) => {
    const k = chave(uid, nome)
    try {
      persistencia?.gravar(`colecao:${k}`, JSON.stringify([...banco(uid, nome).values()]))
    } catch {
      // Cota estourada ou modo privado: a lista em memória continua valendo.
    }
    avisar(nome)
  }
  const precisaDeConta = () => {
    const uid = uidAtual()
    if (!uid) throw new ErroDoSistema('sem-conta')
    return uid
  }

  const pararConta = aoMudarConta(() => {
    for (const nome of ouvintes.keys()) avisar(nome)
  })

  return {
    abrir(nome) {
      if (!conhecidas.has(nome)) {
        throw new ErroDoSistema(
          'colecao-desconhecida',
          `coleção "${nome}" não está no mapa deste app (${[...conhecidas].join(', ') || 'nenhuma'})`,
        )
      }
      return Object.freeze({
        observar(aoMudar, aoErrar = () => {}) {
          if (typeof aoMudar !== 'function') throw new TypeError('observar(aoMudar, aoErrar?)')
          const o = { aoMudar, aoErrar }
          if (!ouvintes.has(nome)) ouvintes.set(nome, new Set())
          ouvintes.get(nome).add(o)
          aoMudar(lista(nome))
          return () => ouvintes.get(nome)?.delete(o)
        },
        async criar(id, campos) {
          const uid = precisaDeConta()
          conferirIdDeDocumento(id)
          const limpos = conferirCampos(campos)
          const t = agora()
          banco(uid, nome).set(id, { ...limpos, id, criadoEm: t, atualizadoEm: t })
          gravado(uid, nome)
        },
        async atualizar(id, campos) {
          const uid = precisaDeConta()
          conferirIdDeDocumento(id)
          const limpos = conferirCampos(campos)
          const b = banco(uid, nome)
          const antes = b.get(id) ?? { id }
          b.set(id, { ...antes, ...limpos, id, atualizadoEm: agora() })
          gravado(uid, nome)
        },
        async apagar(id) {
          const uid = precisaDeConta()
          conferirIdDeDocumento(id)
          banco(uid, nome).delete(id)
          gravado(uid, nome)
        },
      })
    },

    /** Para o teste: põe documentos numa conta como se já estivessem lá. */
    semear(nome, uid, docs) {
      const b = banco(uid, nome)
      for (const d of docs) b.set(d.id, JSON.parse(JSON.stringify(d)))
      avisar(nome)
    },
    /** Para o teste: o que está guardado, como o banco guarda. */
    guardado(nome, uid) {
      return [...banco(uid, nome).values()].map((d) => JSON.parse(JSON.stringify(d)))
    },
    ouvintesVivos: () => [...ouvintes.values()].reduce((n, s) => n + s.size, 0),
    encerrar() {
      pararConta?.()
      ouvintes.clear()
    },
  }
}
