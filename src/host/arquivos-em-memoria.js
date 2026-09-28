// A capacidade `arquivos` em memória, com a semântica do sistema do RoqueOS: salvar
// em qualquer pasta da lista sem sobrescrever, listar e abrir só a pasta declarada,
// ref opaca que só este cofre resolve, sem conta rejeita. O sistema falso usa no
// teste do app, e o de desenvolvimento no `yarn dev` (lá, salvar também baixa o
// arquivo, e abrir a pasta é uma linha no console).

import { ErroDoSistema } from '../erros.js'
import {
  conferirArquivo,
  conferirPastaDeclarada,
  conferirTipos,
  criarCofreDeRefs,
  entradaDeArquivo,
  ordenarArquivos,
  tipoCasa,
} from '../arquivos.js'

const comoBlob = (conteudo, tipo) =>
  typeof Blob !== 'undefined' && conteudo instanceof Blob
    ? conteudo
    : new Blob([conteudo ?? ''], { type: tipo })

/**
 * @param {{
 *   pastas: string[],
 *   uidAtual: () => string | null,
 *   agora?: () => number,
 *   aoSalvar?: (arquivo: object) => void,
 *   aoAbrirPasta?: (pasta: string) => void,
 * }} opcoes
 */
export function criarArquivosEmMemoria({
  pastas,
  uidAtual,
  agora = () => Date.now(),
  aoSalvar = () => {},
  aoAbrirPasta = () => {},
}) {
  const declaradas = Object.freeze([...pastas])
  /** id → { id, pasta, nome, tipo, conteudo, tamanho, modificadoEm } */
  const todos = new Map()
  const cofre = criarCofreDeRefs()
  let proximo = 0

  const precisaDeConta = () => {
    if (!uidAtual()) throw new ErroDoSistema('sem-conta')
  }
  const guardar = ({ pasta, nome, tipo, conteudo, modificadoEm }) => {
    const id = `a${++proximo}`
    const blob = comoBlob(conteudo, tipo)
    todos.set(id, { id, pasta, nome, tipo, conteudo, tamanho: blob.size, modificadoEm })
    return id
  }
  const refDe = (id) => cofre.emitir({ id })

  const arquivos = Object.freeze({
    async salvar(pedido) {
      const a = conferirArquivo(pedido)
      precisaDeConta()
      aoSalvar(a)
      const id = guardar({ ...a, modificadoEm: agora() })
      return { nome: a.nome, pasta: a.pasta, ref: refDe(id) }
    },
    async listar(pasta, { tipos } = {}) {
      conferirPastaDeclarada(pasta, declaradas)
      const filtro = conferirTipos(tipos)
      precisaDeConta()
      const daPasta = [...todos.values()].filter(
        (a) => a.pasta === pasta && tipoCasa(a.tipo, filtro),
      )
      return ordenarArquivos(daPasta).map((a) => entradaDeArquivo({ ...a, ref: refDe(a.id) }))
    },
    async ler(ref) {
      const { id } = cofre.resolver(ref)
      precisaDeConta()
      const a = todos.get(id)
      if (!a) throw new ErroDoSistema('nao-encontrado')
      return comoBlob(a.conteudo, a.tipo)
    },
    async abrirPasta(pasta) {
      conferirPastaDeclarada(pasta, declaradas)
      precisaDeConta()
      aoAbrirPasta(pasta)
    },
  })

  return {
    arquivos,
    /** Para o teste: um arquivo que a pessoa já tinha naquela pasta. */
    semear(
      pasta,
      { nome, tipo = 'application/octet-stream', conteudo = '', modificadoEm = agora() },
    ) {
      guardar({ pasta, nome, tipo, conteudo, modificadoEm })
    },
    /** Para o teste: o que há na pasta, os mais novos primeiro, sem ref. */
    guardados(pasta) {
      return ordenarArquivos([...todos.values()].filter((a) => a.pasta === pasta)).map(
        ({ nome, tipo, conteudo, tamanho, modificadoEm }) => ({
          nome,
          tipo,
          conteudo,
          tamanho,
          modificadoEm,
        }),
      )
    },
    /**
     * O "abrir com": o arquivo entra fora das pastas declaradas, e a ref dele vale
     * para `ler` mesmo assim. Devolve o que a abertura carrega.
     */
    entregar({ nome, tipo = 'application/octet-stream', conteudo = '' }) {
      const id = guardar({ pasta: null, nome, tipo, conteudo, modificadoEm: agora() })
      return { ref: refDe(id), nome, tipo }
    },
    refs: () => cofre.tamanho(),
  }
}
