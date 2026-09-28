// A CAPACIDADE `colecoes`: documentos do app guardados na conta de quem usa.
//
// `armazenamento` é chave e valor no aparelho. Nota, alarme, lousa e favorito do
// mapa precisam de outra coisa: estar em todo aparelho da pessoa, aparecer em
// tempo real quando mudam em outro lugar, e às vezes ser o mesmo dado que o
// próprio RoqueOS mostra (a nota das Notas é o post-it da área de trabalho). O
// app não fala com banco (o `app check` reprova `firebase` no `src/`); ele pede
// ao sistema uma coleção pelo nome, e o sistema sabe onde ela mora.
//
// O que o contrato garante, em qualquer sistema:
//
//   const notas = sistema.colecoes.abrir('notas')   // nome fora do mapa: ErroDoSistema
//   const parar = notas.observar((docs) => ..., (erro) => ...)
//   const uma = await notas.ler(id)                 // um documento só, ou null (0.3.0)
//   await notas.criar(id, campos)                   // grava o documento inteiro
//   await notas.atualizar(id, campos)               // troca SÓ os campos enviados
//   await notas.apagar(id)
//
// - Cada documento chega como objeto simples, `{ id, ...campos, criadoEm,
//   atualizadoEm }`, com as duas datas em milissegundos. As datas são do sistema:
//   ele carimba sozinho, e o app que manda `criadoEm` ou `atualizadoEm` recebe
//   `campo-do-sistema`. Nota criada sem rede já chega com a data estimada, nunca
//   com null.
// - `atualizar` substitui cada campo enviado por inteiro e não encosta nos outros.
//   É isso que deixa dois donos escreverem no mesmo documento: as Notas trocam o
//   texto, o post-it da mesa troca a posição, e um não apaga o do outro. Mandar o
//   documento inteiro de volta é o erro que esta forma existe para impedir.
// - `observar` segue a conta: quando a pessoa entra ou sai, a lista é a da conta
//   nova (vazia para convidado), sem o app refazer nada. Sem conta, gravar
//   rejeita com `sem-conta`; nunca finge que gravou.
// - A promessa de gravar resolve quando o sistema confirma. Sem rede, isso só
//   acontece quando a rede volta, mas a lista observada já mostra a mudança na
//   hora: o app não espera a promessa para mostrar o que a pessoa fez.
// - `ler(id)` traz um documento sem assinar a coleção, e null quando ele não existe
//   ou não há conta. É para documento grande que se abre um de cada vez (um quadro
//   da Lousa pode chegar perto do limite de 1 MB do banco): `observar` a coleção
//   inteira baixaria todos os quadros para mostrar um.
// - O mapa de onde cada coleção mora é do sistema, por app e por nome. Coleção que
//   o sistema não conhece não abre: não existe "qualquer nome vira uma pasta nova"
//   sem regra de banco revisada para ela.

import { ErroDoSistema } from './erros.js'

/** Os campos que o sistema carimba, em milissegundos. O app lê, nunca escreve. */
export const CARIMBOS = Object.freeze(['criadoEm', 'atualizadoEm'])

const ID_DE_DOCUMENTO = /^[A-Za-z0-9_-]{1,128}$/
const PROFUNDIDADE_MAXIMA = 20

/** @param {unknown} id */
export function conferirIdDeDocumento(id) {
  if (typeof id !== 'string' || !ID_DE_DOCUMENTO.test(id)) {
    throw new ErroDoSistema(
      'id-invalido',
      `id de documento ${JSON.stringify(id)}: letras, dígitos, _ e -, até 128`,
    )
  }
  return id
}

const objetoSimples = (v) =>
  v !== null &&
  typeof v === 'object' &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)

function conferirValor(valor, caminho, profundidade) {
  if (profundidade > PROFUNDIDADE_MAXIMA)
    throw new ErroDoSistema('valor-invalido', `${caminho}: aninhado demais`)
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return
  if (typeof valor === 'number') {
    if (Number.isFinite(valor)) return
    throw new ErroDoSistema('valor-invalido', `${caminho}: número que não é finito`)
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => conferirValor(v, `${caminho}[${i}]`, profundidade + 1))
    return
  }
  if (objetoSimples(valor)) {
    for (const [k, v] of Object.entries(valor))
      conferirValor(v, `${caminho}.${k}`, profundidade + 1)
    return
  }
  // undefined, Date, função, Map, instância de classe: o banco não guarda do mesmo
  // jeito em todo sistema (o Firestore recusa undefined, transforma Date em outra
  // coisa). Data vai em milissegundos.
  throw new ErroDoSistema(
    'valor-invalido',
    `${caminho}: ${valor === undefined ? 'undefined' : typeof valor} não é um dado simples`,
  )
}

/**
 * Confere os campos que o app quer gravar e devolve uma cópia. `reservados` são os
 * nomes que o sistema usa por baixo para os carimbos (`createdAt`), que o app
 * também não pode escrever.
 * @param {unknown} campos
 * @param {{ reservados?: string[] }} [opcoes]
 * @returns {Record<string, unknown>}
 */
export function conferirCampos(campos, { reservados = [] } = {}) {
  if (!objetoSimples(campos))
    throw new ErroDoSistema('valor-invalido', 'os campos são um objeto simples')
  for (const [chave, valor] of Object.entries(campos)) {
    if (chave === 'id' || CARIMBOS.includes(chave) || reservados.includes(chave)) {
      throw new ErroDoSistema(
        'campo-do-sistema',
        `"${chave}" é do sistema: o id vai no primeiro argumento e as datas ele carimba`,
      )
    }
    conferirValor(valor, chave, 0)
  }
  return JSON.parse(JSON.stringify(campos))
}
