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
// Por que seis obrigatórias, e não mais: são capacidades que o
// `@roqueos-games/jogo-sdk` já prova em vinte jogos, com a mesma forma e o mesmo
// motivo, e que um app de qualquer tipo usa. Capacidade nova nasce opcional, na
// onda do primeiro app que precisa dela, com motivo escrito; capacidade sem motivo
// vira atalho para o app alcançar o que não devia. O app lista no `app.json` as
// opcionais que usa, e o `mount` recusa o sistema que não as tem.
//
// Versionamento: capacidade nova e opcional é mudança menor, e acrescentar função
// a uma opcional também, porque o app de antes continua servido pelo sistema novo
// (a 0.3.0 deu `listar`, `ler` e `abrirPasta` a `arquivos`). Tirar função, ou mudar
// a forma ou o sentido de uma que existe, é versão nova do contrato, e o sistema
// recusa o app que pede outra versão em vez de quebrar em runtime. No RoqueOS o
// app e o sistema usam uma cópia só do SDK, então app novo em sistema velho não
// chega a montar.

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
      'avisar(mensagem, { tipo, fixo, titulo }) com tipo info, sucesso, aviso ou erro. É o que a pessoa PRECISA ler. fixo: true fica na tela até ela fechar, para o aviso que não pode sumir sozinho ("não consegui salvar, nada foi perdido"). titulo (desde 0.2.0, opcional) é a linha forte da notificação; o nome do app o sistema põe sozinho. Sistema que não sabe fazer aviso fixo mostra passageiro, e o que não sabe mostrar título junta ao texto: pior, mas sem quebrar.',
  },
  idioma: {
    obrigatoria: true,
    forma: { atual: FN, aoMudar: FN },
    porque:
      'atual() devolve um dos dez idiomas; aoMudar(fn) avisa a troca com a janela aberta e devolve parar(). O texto do app mora no app e desce quando ele monta, não no pacote de entrada do RoqueOS.',
  },
  desempenho: {
    obrigatoria: true,
    forma: { modoLeve: FN },
    porque:
      'modoLeve() diz se o aparelho pede o perfil leve: sem efeito que segue o sensor, sem animação contínua, sem sombra pesada. O RoqueOS decide isso uma vez, para o sistema inteiro; o app que lê o atributo do documento por conta própria depende de um detalhe do RoqueOS que ninguém trava, e o app que ignora derruba o aparelho fraco.',
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

  // As opcionais nasceram na Onda 4a do Goal 28 (0.2.0), com as Notas: o primeiro
  // app que guarda na conta, usa a IA, salva nos Arquivos e é aberto por outro
  // pedaço do sistema. O que cada uma garante está no arquivo dela.
  colecoes: {
    obrigatoria: false,
    forma: { abrir: FN },
    porque:
      'abrir(nome) devolve { observar, ler, criar, atualizar, apagar } sobre documentos na conta da pessoa, em tempo real e em todo aparelho dela. ler(id) (0.3.0) traz um documento só, sem assinar a coleção: a Lousa guarda cada quadro num documento grande e abre um de cada vez. O app não fala com banco; o sistema tem o mapa de onde cada coleção de cada app mora, e é ele quem carimba criadoEm e atualizadoEm. atualizar troca só os campos enviados, para dois donos escreverem no mesmo documento sem um apagar o outro (a nota das Notas é o post-it da mesa). Detalhes em src/colecoes.js.',
  },
  ia: {
    obrigatoria: false,
    forma: { abrirPainel: FN },
    porque:
      'abrirPainel({ ancora, tipo, contexto, aplicar, acento, aoFechar }) abre o painel de IA do sistema dentro de um elemento do app, sobre o conteúdo que o app entrega, e devolve { fechar }. O RoqueOS tem um painel de IA só para todos os apps, e a chave dos agentes nunca chega ao app. Detalhes em src/ia.js.',
  },
  arquivos: {
    obrigatoria: false,
    forma: { salvar: FN, listar: FN, ler: FN, abrirPasta: FN },
    porque:
      'salvar({ nome, conteudo, tipo, pasta }) guarda um arquivo nos Arquivos da pessoa e devolve { nome, pasta, ref }. listar(pasta, { tipos }) devolve [{ ref, nome, tipo, tamanho, modificadoEm }], ler(ref) devolve o Blob e abrirPasta(pasta) mostra a pasta no Finder (0.3.0). A pasta é de uma lista curta, não um caminho livre; listar e abrir só a que o app declara em pastas no app.json; a ref é opaca e vale só nesta sessão; nada é sobrescrito. Detalhes em src/arquivos.js.',
  },
  abertura: {
    obrigatoria: false,
    forma: { atual: FN, aoMudar: FN },
    porque:
      'atual() devolve o que quem abriu a janela mandou ({ nota: "note_1" }, ou {}), e aoMudar(fn) avisa o pedido novo quando a janela já aberta é chamada de novo, e devolve parar(). Sem isso, o post-it abre as Notas sempre na lista, e o segundo post-it clicado não muda nada. O "abrir com" do Finder chega aqui como { arquivo: { ref, nome, tipo } } (0.3.0). Detalhes em src/abertura.js.',
  },
  janela: {
    obrigatoria: false,
    forma: { telaCheia: FN, emTelaCheia: FN, aoMudarTelaCheia: FN },
    porque:
      'telaCheia(true | false) pede a tela cheia à janela e resolve com o estado real; emTelaCheia() diz o estado; aoMudarTelaCheia(fn) avisa quando a pessoa sai por conta própria, e devolve parar(). É o sistema quem faz, porque a tela cheia do RoqueOS escreve no <html>, o que um app não pode. Detalhes em src/janela.js.',
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
