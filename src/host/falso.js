// SISTEMA FALSO: o contrato inteiro em memória, para o teste do app.
//
// O teste monta o app com este sistema e confere o que ele fez: o que avisou,
// o que mediu, o que gravou. E consegue mexer no mundo em volta do jeito que o
// RoqueOS mexe: trocar o idioma com a janela aberta, entrar e sair da conta.

import { VERSAO_DO_CONTRATO } from '../contrato.js'
import { IDIOMA_CANONICO, normalizarIdioma } from '../idiomas.js'
import { armazenamentoDoApp, armazenamentoEmMemoria } from './armazenamento.js'

/**
 * @param {{ appId?: string, idioma?: string, identidade?: { uid: string|null, nome: string|null }, modoLeve?: boolean }} [opcoes]
 */
export function criarSistemaFalso({
  appId = 'teste',
  idioma = IDIOMA_CANONICO,
  identidade = { uid: null, nome: null },
  modoLeve = false,
} = {}) {
  let idiomaAtual = normalizarIdioma(idioma)
  let quem = { ...identidade }
  const ouvintesDeIdioma = new Set()
  const ouvintesDeIdentidade = new Set()
  const storage = armazenamentoEmMemoria()
  const registro = { avisos: [], eventos: [] }

  const ouvir = (conjunto) => (fn) => {
    conjunto.add(fn)
    return () => conjunto.delete(fn)
  }

  const sistema = {
    versaoDoContrato: VERSAO_DO_CONTRATO,
    identidade: {
      atual: () => ({ ...quem }),
      aoMudar: ouvir(ouvintesDeIdentidade),
    },
    avisar(mensagem, { tipo = 'info', fixo = false } = {}) {
      registro.avisos.push({ mensagem: String(mensagem), tipo, fixo })
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
  }

  return {
    sistema,
    /** O que o app fez: `avisos` e `eventos`, na ordem. */
    registro,
    /** O Storage por baixo, com as chaves já no formato roqueos:<app>:<chave>. */
    storage,
    /** Troca o idioma como o RoqueOS troca: com a janela aberta. */
    mudarIdioma(novo) {
      idiomaAtual = normalizarIdioma(novo)
      for (const fn of [...ouvintesDeIdioma]) fn(idiomaAtual)
    },
    /** Entra ou sai da conta: `{ uid, nome }`, ou `{ uid: null, nome: null }`. */
    mudarIdentidade(nova) {
      quem = { uid: nova?.uid ?? null, nome: nova?.nome ?? null }
      for (const fn of [...ouvintesDeIdentidade]) fn({ ...quem })
    },
    /** Quantos ouvintes ainda estão presos: o teste do desmontar confere que voltou a zero. */
    ouvintesVivos: () => ouvintesDeIdioma.size + ouvintesDeIdentidade.size,
  }
}
