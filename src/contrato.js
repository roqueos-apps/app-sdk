// O CONTRATO ENTRE O ROQUEOS E UM APP.
//
// O app não importa nada do RoqueOS. Ele recebe um `sistema` com capacidades, e
// é só por elas que fala com o RoqueOS: quem está usando, em que idioma, onde
// guardar o que é dele, como avisar alguma coisa na tela. O sistema do RoqueOS
// implementa isto por cima das stores dele; o sistema de desenvolvimento
// implementa com o navegador puro, para o app rodar sozinho; o sistema falso
// implementa em memória, para teste.
//
// Por que capacidade, e não store: um app que recebe a store inteira pode abrir
// janela, ler credencial de servidor e mexer no desktop. Um app que recebe
// `armazenamento.gravar` só consegue gravar no espaço dele. Num app de primeira
// parte isto organiza o código, e não é fronteira de segurança: código na mesma
// origem lê o que a página lê. A segurança de um app de primeira parte vem da
// revisão no merge e do pin exato de versão no RoqueOS. A fronteira de verdade
// é a do modo comunidade (iframe em outra origem), que usa este mesmo contrato.
//
// Por que estas cinco, e não mais: são as cinco que o `@roqueos-games/jogo-sdk`
// já prova em vinte jogos, com a mesma forma e o mesmo motivo. Capacidade nova
// nasce opcional, na onda do primeiro app que precisa dela, com motivo escrito;
// capacidade sem motivo vira atalho para o app alcançar o que não devia.
//
// Versionamento: capacidade nova e opcional é mudança menor; mudar a forma de
// uma que existe é versão nova do contrato, e o sistema recusa o app que pede
// outra versão em vez de quebrar em runtime.

export const VERSAO_DO_CONTRATO = 1

/** Função. Qualquer outro valor em `forma` é um objeto com aquelas chaves. */
export const FN = 'fn'

/**
 * As capacidades, com a forma que o sistema precisa entregar e o motivo de cada
 * uma existir. O motivo é parte do contrato.
 */
export const CAPACIDADES = Object.freeze({
  identidade: {
    obrigatoria: true,
    forma: { atual: FN, aoMudar: FN },
    porque:
      'atual() devolve { uid, nome } ou { uid: null, nome: null } para convidado. aoMudar(fn) devolve parar(). O app usa para decidir se oferece o que depende de conta.',
  },
  avisar: {
    obrigatoria: true,
    forma: FN,
    porque:
      'avisar(mensagem, { tipo, fixo }) com tipo info, sucesso, aviso ou erro. É o que a pessoa PRECISA ler. fixo: true fica na tela até ela fechar, para o aviso que não pode sumir sozinho ("não consegui salvar, nada foi perdido"). Sistema que não sabe fazer aviso fixo mostra passageiro, pior mas sem quebrar.',
  },
  idioma: {
    obrigatoria: true,
    forma: { atual: FN, aoMudar: FN },
    porque:
      'atual() devolve um dos dez idiomas; aoMudar(fn) avisa a troca com a janela aberta e devolve parar(). O texto do app mora no app e desce quando ele monta, não no pacote de entrada do RoqueOS.',
  },
  metricas: {
    obrigatoria: true,
    forma: { evento: FN },
    porque:
      'evento(nome, dados) registra uso. Os nomes de evento são do app e não mudam sem motivo, porque o histórico depende deles.',
  },
  armazenamento: {
    obrigatoria: true,
    forma: { ler: FN, gravar: FN, apagar: FN },
    porque:
      'Chave e valor em texto, no espaço roqueos:<app>:<chave>, no aparelho. É o mesmo formato das chaves que os apps já usavam no localStorage do RoqueOS, e é o que garante que ninguém perde o que tinha quando o app sai do núcleo. O sistema já nasce preso ao app: um app não lê a chave de outro.',
  },
})

export const OBRIGATORIAS = Object.freeze(
  Object.keys(CAPACIDADES).filter((c) => CAPACIDADES[c].obrigatoria),
)
export const OPCIONAIS = Object.freeze(
  Object.keys(CAPACIDADES).filter((c) => !CAPACIDADES[c].obrigatoria),
)

/** Os tipos de aviso que `avisar` entende. */
export const TIPOS_DE_AVISO = Object.freeze(['info', 'sucesso', 'aviso', 'erro'])

function conferirForma(valor, forma, caminho, problemas) {
  if (forma === FN) {
    if (typeof valor !== 'function') problemas.push(`${caminho} precisa ser função`)
    return
  }
  if (!valor || typeof valor !== 'object') {
    problemas.push(`${caminho} precisa ser um objeto com ${Object.keys(forma).join(', ')}`)
    return
  }
  for (const [chave, sub] of Object.entries(forma)) {
    conferirForma(valor[chave], sub, `${caminho}.${chave}`, problemas)
  }
}

/**
 * Confere se um sistema cumpre o contrato: a versão, as obrigatórias e as
 * opcionais que o app declarou exigir. Devolve a lista inteira de problemas,
 * não o primeiro, porque sistema incompleto se conserta de uma vez.
 * @param {object} sistema
 * @param {{ exigidas?: string[] }} [opcoes]
 * @returns {{ ok: boolean, problemas: string[] }}
 */
export function verificarSistema(sistema, { exigidas = [] } = {}) {
  const problemas = []
  if (!sistema || typeof sistema !== 'object') {
    return { ok: false, problemas: ['sistema ausente'] }
  }
  if (sistema.versaoDoContrato !== VERSAO_DO_CONTRATO) {
    problemas.push(
      `o sistema fala o contrato ${sistema.versaoDoContrato ?? '(sem versão)'}, o app fala o ${VERSAO_DO_CONTRATO}`,
    )
  }
  for (const nome of exigidas) {
    if (!(nome in CAPACIDADES)) problemas.push(`o app exige "${nome}", que não existe no contrato`)
  }
  const olhar = new Set([...OBRIGATORIAS, ...exigidas.filter((n) => n in CAPACIDADES)])
  for (const nome of Object.keys(CAPACIDADES)) {
    const presente = sistema[nome] !== undefined && sistema[nome] !== null
    if (!presente) {
      if (olhar.has(nome)) problemas.push(`falta a capacidade "${nome}"`)
      continue
    }
    conferirForma(sistema[nome], CAPACIDADES[nome].forma, nome, problemas)
  }
  return { ok: problemas.length === 0, problemas }
}
