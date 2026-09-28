// A capacidade `anexos` em memória, com a semântica do sistema do RoqueOS: id que
// dura entre sessões, preso ao app e à conta, sem conta rejeita, limite de tamanho
// antes de guardar. O sistema falso usa no teste do app; o de desenvolvimento, no
// `yarn dev`.
//
// O `banco` é o que dura. Duas janelas do mesmo app que recebem o mesmo banco são
// duas sessões do mesmo app na mesma conta: o id que uma guardou a outra lê. É o
// que o teste do app usa para provar que o quadro reabre com a imagem.

import { ErroDoSistema } from '../erros.js'
import { conferirConteudoDeAnexo, conferirIdDeAnexo, gerarIdDeAnexo } from '../anexos.js'

/** Um banco de anexos vazio, para dividir entre sessões no teste. */
export const criarBancoDeAnexos = () => new Map()

/**
 * @param {{
 *   appId: string,
 *   uidAtual: () => string | null,
 *   banco?: Map<string, Blob>,
 *   gerarId?: () => string,
 * }} opcoes
 */
export function criarAnexosEmMemoria({
  appId,
  uidAtual,
  banco = criarBancoDeAnexos(),
  gerarId = gerarIdDeAnexo,
}) {
  const precisaDeConta = () => {
    const uid = uidAtual()
    if (!uid) throw new ErroDoSistema('sem-conta')
    return uid
  }
  // A chave de verdade leva a conta e o app: o id sozinho não alcança o de outro.
  const chave = (uid, id) => `${uid}/${appId}/${id}`

  const anexos = Object.freeze({
    async guardar(conteudo) {
      const blob = conferirConteudoDeAnexo(conteudo)
      const uid = precisaDeConta()
      const id = gerarId()
      banco.set(chave(uid, id), blob)
      return { id }
    },
    async ler(id) {
      conferirIdDeAnexo(id)
      const uid = precisaDeConta()
      const blob = banco.get(chave(uid, id))
      if (!blob) throw new ErroDoSistema('nao-encontrado')
      return blob
    },
    async apagar(id) {
      conferirIdDeAnexo(id)
      const uid = precisaDeConta()
      banco.delete(chave(uid, id))
    },
  })

  return {
    anexos,
    /** Para o teste: os ids que este app guardou na conta atual. */
    guardados() {
      const uid = uidAtual()
      const prefixo = `${uid}/${appId}/`
      return [...banco.keys()]
        .filter((k) => k.startsWith(prefixo))
        .map((k) => k.slice(prefixo.length))
    },
  }
}
