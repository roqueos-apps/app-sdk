// Os dez idiomas do RoqueOS. pt-BR é o canônico, en-US é obrigatório junto,
// e ar-AR corre da direita para a esquerda. Um app de primeira parte fala os
// dez, porque o Launchpad, a Loja e o site falam os dez. App de comunidade tem
// pt-BR e en-US obrigatórios, e os outros oito são bem-vindos.
//
// A mesma lista mora no `@roqueos-games/jogo-sdk`. São dois pacotes de propósito
// (um jogo não depende do SDK de apps nem o contrário), e o teste
// `idiomas.test.js` trava a lista aqui: idioma novo é mudança no RoqueOS inteiro.

export const IDIOMAS = Object.freeze([
  'pt-BR',
  'en-US',
  'es-ES',
  'fr-FR',
  'de-DE',
  'ja-JP',
  'zh-CN',
  'hi-IN',
  'ru-RU',
  'ar-AR',
])

export const IDIOMA_CANONICO = 'pt-BR'
export const IDIOMA_DE_RECUO = 'en-US'

/** Os idiomas sem os quais um app de comunidade não entra no catálogo. */
export const IDIOMAS_OBRIGATORIOS_DA_COMUNIDADE = Object.freeze(['pt-BR', 'en-US'])

/**
 * Leva o que o navegador diz (`pt`, `pt-PT`, `en-GB`, `zh-Hans-CN`) para um
 * dos dez. Sem casamento, cai no en-US, que é o recuo da casa.
 * @param {string | null | undefined} pedido
 * @returns {string}
 */
export function normalizarIdioma(pedido) {
  if (!pedido || typeof pedido !== 'string') return IDIOMA_DE_RECUO
  const exato = IDIOMAS.find((i) => i.toLowerCase() === pedido.toLowerCase())
  if (exato) return exato
  const lingua = pedido.split(/[-_]/)[0].toLowerCase()
  return IDIOMAS.find((i) => i.split('-')[0] === lingua) ?? IDIOMA_DE_RECUO
}
