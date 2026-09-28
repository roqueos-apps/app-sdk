// A CAPACIDADE `ia`: o painel de IA do sistema, aberto sobre o conteúdo do app.
//
// O RoqueOS tem UM painel de IA para todos os apps, por ordem do founder
// (25/07/2026): os agentes salvos da pessoa, as ações por tipo de conteúdo, o
// campo livre, o resultado. Um app que desenha o próprio painel deriva do resto em
// semanas, e a chave do agente não pode chegar ao app. Então o app não recebe
// agente nem chave: ele diz ONDE o painel aparece, O QUE ele lê e ONDE o resultado
// entra, e o sistema desenha o painel dele ali.
//
//   const painel = sistema.ia.abrirPainel({
//     ancora: elementoDoApp,            // o painel aparece dentro deste elemento
//     tipo: 'text',                     // 'text' | 'code' | 'read': o catálogo de ações
//     contexto: () => nota.conteudo,    // o conteúdo, lido na hora (pode ser promessa)
//     aplicar: (texto) => { ... },      // omita para conteúdo só de leitura
//     acento: '#f59e0b',                // a cor do app
//     aoFechar: () => { ... },          // a pessoa fechou, ou o sistema fechou
//     acoes: [{ id: 'temas', rotulo: 'Agrupar em temas', icone: 'category',
//               prompt: 'Agrupe as ideias a seguir em temas...' }],   // (0.3.0)
//   })
//   painel.fechar()
//
// - `acoes` (0.3.0) são as ações do app, somadas às do catálogo do tipo: a Lousa agrupa um
//   brainstorm em temas e tira dele as ações a fazer. O `rotulo` já vem no idioma de quem
//   usa (o texto mora no app); o `prompt` é o pedido ao modelo; o `icone` é um nome do Material
//   Icons. Até seis, com id único. O sistema não deixa a ação do app tomar o lugar de uma do
//   catálogo.
// - A `ancora` é um elemento VAZIO do app, que o Vue (ou o que for) do app nunca desenha por
//   dentro: o sistema põe o painel lá. O painel cobre o contêiner posicionado mais perto dela;
//   com `display: contents` na âncora, esse contêiner é o pai dela (as Notas fazem assim, com
//   o corpo do editor em `position: relative`).
// - Um painel por janela: abrir outro fecha o anterior (e chama o aoFechar dele).
// - O sistema fecha o painel sozinho quando a janela desmonta.
// - Fora do RoqueOS (no `yarn dev`) o painel diz que a IA roda dentro do RoqueOS;
//   no modo comunidade (iframe em outra origem) a capacidade não existe, porque o
//   painel do sistema não entra num documento de outra origem.

import { ErroDoSistema } from './erros.js'

export const TIPOS_DE_IA = Object.freeze(['text', 'code', 'read'])

/** Quantas ações próprias um app pode somar ao painel. */
export const MAXIMO_DE_ACOES_DE_IA = 6

const ID_DE_ACAO = /^[a-z][a-zA-Z0-9]{0,31}$/
const ICONE = /^[a-z0-9_]{1,40}$/

/** Confere as ações do app e devolve cópias congeladas, ou a lista de problemas. */
function conferirAcoes(acoes, problemas) {
  if (acoes === undefined) return undefined
  if (!Array.isArray(acoes) || acoes.length > MAXIMO_DE_ACOES_DE_IA) {
    problemas.push(`acoes: lista de até ${MAXIMO_DE_ACOES_DE_IA}`)
    return undefined
  }
  const vistos = new Set()
  const saida = []
  acoes.forEach((a, i) => {
    const { id, rotulo, prompt, icone } = a ?? {}
    if (typeof id !== 'string' || !ID_DE_ACAO.test(id) || vistos.has(id))
      problemas.push(`acoes[${i}].id: letras e dígitos, começando por minúscula, sem repetir`)
    if (typeof rotulo !== 'string' || !rotulo.trim() || rotulo.length > 60)
      problemas.push(`acoes[${i}].rotulo: texto de até 60 caracteres, no idioma de quem usa`)
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000)
      problemas.push(`acoes[${i}].prompt: o pedido ao modelo, até 2000 caracteres`)
    if (icone !== undefined && (typeof icone !== 'string' || !ICONE.test(icone)))
      problemas.push(`acoes[${i}].icone: nome do Material Icons`)
    vistos.add(id)
    saida.push(Object.freeze({ id, rotulo, prompt, ...(icone ? { icone } : {}) }))
  })
  return Object.freeze(saida)
}

/**
 * Confere o pedido de `abrirPainel`.
 * @param {any} pedido
 */
export function conferirPedidoDeIa(pedido = {}) {
  const { ancora, tipo, contexto, aplicar, acento, titulo, aoFechar, acoes } = pedido ?? {}
  const problemas = []
  if (!ancora || typeof ancora !== 'object' || typeof ancora.appendChild !== 'function')
    problemas.push('ancora: o elemento do app onde o painel aparece')
  if (!TIPOS_DE_IA.includes(tipo)) problemas.push(`tipo: um de ${TIPOS_DE_IA.join(', ')}`)
  if (typeof contexto !== 'function') problemas.push('contexto: função que devolve o conteúdo')
  if (aplicar !== undefined && typeof aplicar !== 'function') problemas.push('aplicar: função')
  if (aoFechar !== undefined && typeof aoFechar !== 'function') problemas.push('aoFechar: função')
  if (acento !== undefined && !/^#[0-9a-f]{6}$/i.test(acento))
    problemas.push('acento: hexadecimal de seis dígitos')
  if (titulo !== undefined && typeof titulo !== 'string') problemas.push('titulo: texto')
  const acoesConferidas = conferirAcoes(acoes, problemas)
  if (problemas.length)
    throw new ErroDoSistema('valor-invalido', `abrirPainel: ${problemas.join('; ')}`)
  return {
    ancora,
    tipo,
    contexto,
    aplicar,
    acento,
    titulo,
    aoFechar,
    ...(acoesConferidas ? { acoes: acoesConferidas } : {}),
  }
}
