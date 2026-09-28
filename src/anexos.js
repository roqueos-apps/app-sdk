// A CAPACIDADE `anexos`: bytes que são do app, guardados na conta da pessoa por um
// id que dura.
//
//   const { id } = await sistema.anexos.guardar(blob)   // a imagem colada na Lousa
//   const blob = await sistema.anexos.ler(id)            // amanhã, em outro aparelho
//   await sistema.anexos.apagar(id)
//
// O app guarda o id dentro do próprio dado (o elemento do quadro leva `{ anexo: id
// }`) e, ao abrir, lê o Blob e desenha por `URL.createObjectURL`.
//
// Por que não `arquivos`: a imagem colada no quadro é dado do app, não um arquivo
// que a pessoa organiza no Finder. Os Arquivos entregam ref que morre com a sessão
// (de propósito: o app não guarda ponteiro para a pasta da pessoa), e um quadro
// precisa de um ponteiro que abra amanhã.
//
// Por que id, e não URL: uma URL durável do Storage é um link que qualquer um que o
// tenha lê, para sempre. Entregue a um app de terceiro (o modo comunidade, Onda 8),
// ela sai pela rede e continua valendo. O id só vira bytes passando pelo sistema,
// que confere o app e a conta a cada leitura; é a mesma propriedade que fez a ref
// dos Arquivos ser opaca.
//
// O que o contrato garante, nos três sistemas:
//   - O id é do sistema (`anx_` e 24 letras ou dígitos) e é o mesmo em toda sessão
//     e todo aparelho da pessoa. Id fora do formato rejeita com `id-invalido`.
//   - O anexo é do app E da conta: o id de outro app, ou de outra conta, não
//     existe aqui, e `ler` rejeita com `nao-encontrado`, igual ao apagado.
//   - Sem conta, tudo rejeita com `sem-conta`. O app decide o que faz sem conta (a
//     Lousa de convidado não guarda o quadro, e embute a imagem nele).
//   - Até 10 MB por anexo; acima disso, `grande-demais`, antes de subir um byte.
//   - `apagar` de um id que não existe não é erro: o resultado é o mesmo.
//   - O tipo do Blob (`image/png`) volta no `ler`.
//
// Anexo que o app esquece de apagar (o elemento saiu do quadro, o anexo ficou) é
// risco aceito na primeira versão: o sistema não sabe o que o app ainda usa.
//
// Nasceu na 0.3.0, com a Lousa.

import { ErroDoSistema } from './erros.js'

/** O maior anexo que a capacidade aceita, em bytes. */
export const TAMANHO_MAXIMO_DE_ANEXO = 10 * 1024 * 1024

const ID_DE_ANEXO = /^anx_[a-z0-9]{24}$/

// 32 símbolos: cada byte aleatório cai em um deles sem viés (256 é múltiplo de 32).
const SIMBOLOS = 'abcdefghijklmnopqrstuvwxyz234567'

/** Um id novo de anexo: `anx_` e 24 símbolos aleatórios (120 bits). */
export function gerarIdDeAnexo() {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return `anx_${Array.from(bytes, (b) => SIMBOLOS[b % 32]).join('')}`
}

/** Confere o id que o app mandou. */
export function conferirIdDeAnexo(id) {
  if (typeof id !== 'string' || !ID_DE_ANEXO.test(id)) {
    throw new ErroDoSistema('id-invalido', `${JSON.stringify(id)} não é um id de anexo`)
  }
  return id
}

/** Confere o conteúdo de `guardar`: um Blob (ou File) de até 10 MB. */
export function conferirConteudoDeAnexo(conteudo) {
  if (typeof Blob === 'undefined' || !(conteudo instanceof Blob)) {
    throw new ErroDoSistema('valor-invalido', 'guardar(conteudo) recebe um Blob ou um File')
  }
  if (conteudo.size > TAMANHO_MAXIMO_DE_ANEXO) {
    throw new ErroDoSistema(
      'grande-demais',
      `o anexo tem ${conteudo.size} bytes, e o limite é ${TAMANHO_MAXIMO_DE_ANEXO}`,
    )
  }
  return conteudo
}
