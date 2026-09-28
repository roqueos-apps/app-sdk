// O MANIFESTO DO APP: `app.json`, na raiz do repo de cada app.
//
// É o app dizendo quem ele é. O RoqueOS lê os manifestos dos apps instalados e
// gera a partir deles o registro de apps, o carregador de cada janela, a
// pré-carga, e o nome e a descrição nos dez idiomas. Antes da extração isso
// eram listas escritas à mão no front, e cada app novo precisava lembrar de
// todas.
//
// O `id` é PERMANENTE: é a chave da janela, do dock, do armazenamento
// (`roqueos:<id>:<chave>`) e das preferências de quem já usa o app. Mudar o id
// é perder o que a pessoa tinha. Quem trava isso é o RoqueOS, que compara com o
// id já publicado; aqui se confere só o formato.
//
// Campo que o manifesto não conhece reprova: um `maximizável` com acento seria
// ignorado em silêncio, e a janela abriria diferente do que o autor escreveu.

import { OPCIONAIS, CAPACIDADES, VERSAO_DO_CONTRATO } from './contrato.js'
import { IDIOMAS, IDIOMAS_OBRIGATORIOS_DA_COMUNIDADE } from './idiomas.js'
import { PASTAS_DE_ARQUIVOS, ehPadraoDeTipo } from './arquivos.js'

/**
 * As categorias da Loja e do Launchpad, com o valor que o RoqueOS usa. `system`
 * fica de fora de propósito: app de sistema é do núcleo e não sai dele.
 */
export const CATEGORIAS = Object.freeze([
  'productivity',
  'creativity',
  'media',
  'utilities',
  'entertainment',
  'social',
  'development',
])

/**
 * Onde o app roda. `primeira-parte`: nosso, na mesma origem, compilado pelo
 * RoqueOS a partir da tag. `comunidade`: de qualquer pessoa, num iframe em outra
 * origem (a camada nasce depois; o manifesto já sabe o nome).
 */
export const CAMADAS = Object.freeze(['primeira-parte', 'comunidade'])

const CAMPOS = new Set([
  'id',
  'versaoDoContrato',
  'camada',
  'nome',
  'descricao',
  'icone',
  'cor',
  'categoria',
  'janela',
  'naLoja',
  'capacidades',
  'colecoes',
  'pastas',
  'abre',
  'autor',
  'licenca',
])
const CAMPOS_DA_JANELA = new Set(['largura', 'altura', 'minLargura', 'minAltura', 'maximizavel'])

const ID = /^[a-z][a-z0-9]*$/
const NOME_DE_COLECAO = /^[a-z][a-zA-Z0-9]*$/
const texto = (v) => typeof v === 'string' && v.trim().length > 0

function porIdioma(valor, campo, obrigatorios, problemas) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    problemas.push(`${campo} precisa de um texto por idioma`)
    return
  }
  const faltando = obrigatorios.filter((i) => !texto(valor[i]))
  if (faltando.length) problemas.push(`${campo} sem texto em: ${faltando.join(', ')}`)
  const sobrando = Object.keys(valor).filter((i) => !IDIOMAS.includes(i))
  if (sobrando.length)
    problemas.push(`${campo} tem idioma que a casa não fala: ${sobrando.join(', ')}`)
  const vazios = Object.keys(valor).filter((i) => IDIOMAS.includes(i) && !texto(valor[i]))
  const vaziosFora = vazios.filter((i) => !obrigatorios.includes(i))
  if (vaziosFora.length) problemas.push(`${campo} com texto vazio em: ${vaziosFora.join(', ')}`)
}

function janela(j, problemas) {
  if (!j || typeof j !== 'object') {
    problemas.push('janela: largura, altura, minLargura e minAltura em pixels')
    return
  }
  const medidas = [j.largura, j.altura, j.minLargura, j.minAltura]
  if (!medidas.every((n) => Number.isInteger(n) && n > 0)) {
    problemas.push('janela: largura, altura, minLargura e minAltura em pixels')
  } else if (j.minLargura > j.largura || j.minAltura > j.altura) {
    problemas.push('janela: o mínimo não pode passar do tamanho inicial')
  }
  if (j.maximizavel !== undefined && typeof j.maximizavel !== 'boolean')
    problemas.push('janela.maximizavel: true ou false')
  const estranhos = Object.keys(j).filter((k) => !CAMPOS_DA_JANELA.has(k))
  if (estranhos.length) problemas.push(`janela com campo desconhecido: ${estranhos.join(', ')}`)
}

/**
 * Confere um manifesto. Devolve todos os problemas de uma vez.
 * @param {any} m o conteúdo de app.json
 * @returns {string[]}
 */
export function validarManifesto(m) {
  const problemas = []
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['app.json não é um objeto']

  const estranhos = Object.keys(m).filter((k) => !CAMPOS.has(k))
  if (estranhos.length) problemas.push(`campo que o manifesto não conhece: ${estranhos.join(', ')}`)

  if (!ID.test(m.id ?? '')) problemas.push(`id inválido: ${JSON.stringify(m.id)}`)
  if (m.versaoDoContrato !== VERSAO_DO_CONTRATO) {
    problemas.push(
      `versaoDoContrato é ${m.versaoDoContrato}, este SDK fala o ${VERSAO_DO_CONTRATO}`,
    )
  }
  if (!CAMADAS.includes(m.camada)) problemas.push(`camada: uma de ${CAMADAS.join(', ')}`)

  // Primeira parte fala os dez, como o resto do RoqueOS; comunidade, pt-BR e en-US.
  const obrigatorios = m.camada === 'comunidade' ? IDIOMAS_OBRIGATORIOS_DA_COMUNIDADE : IDIOMAS
  porIdioma(m.nome, 'nome', obrigatorios, problemas)
  porIdioma(m.descricao, 'descricao', obrigatorios, problemas)

  // O ícone é o nome de um Material Icon (o que o RoqueOS já desenha) ou um SVG do repo.
  if (!/^[a-z0-9_]+$/.test(m.icone ?? '') && !/^[\w./-]+\.svg$/.test(m.icone ?? ''))
    problemas.push('icone: nome de Material Icon (calculate) ou caminho de SVG no repo')
  if (!/^#[0-9a-f]{6}$/i.test(m.cor ?? '')) problemas.push('cor: hexadecimal de seis dígitos')
  if (!CATEGORIAS.includes(m.categoria))
    problemas.push(`categoria: uma de ${CATEGORIAS.join(', ')}`)
  janela(m.janela, problemas)
  if (m.naLoja !== undefined && typeof m.naLoja !== 'boolean')
    problemas.push('naLoja: true ou false')
  if (!texto(m.autor)) problemas.push('autor: quem responde pelo app')
  if (!texto(m.licenca)) problemas.push('licenca: o identificador SPDX (MIT)')

  const caps = m.capacidades ?? []
  if (!Array.isArray(caps)) problemas.push('capacidades: lista')
  else {
    const erradas = caps.filter((c) => !OPCIONAIS.includes(c))
    if (erradas.length) {
      problemas.push(
        `capacidades só lista as opcionais que o app exige (${OPCIONAIS.join(', ') || 'nenhuma nesta versão'}); ` +
          `não reconhecidas ou obrigatórias: ${erradas.join(', ')}` +
          (erradas.some((c) => c in CAPACIDADES) ? ' (as obrigatórias o sistema sempre dá)' : ''),
      )
    }
  }

  // As coleções que o app abre, pelo nome. O RoqueOS confere no build que cada uma
  // está no mapa dele (onde mora, com que regra de banco); sem esta lista, a coleção
  // que falta no mapa só aparece quando alguém abre o app.
  const usaColecoes = Array.isArray(caps) && caps.includes('colecoes')
  if (m.colecoes !== undefined) {
    const lista = m.colecoes
    if (!Array.isArray(lista) || lista.length === 0 || !lista.every((n) => NOME_DE_COLECAO.test(n)))
      problemas.push('colecoes: lista de nomes (minúsculas e dígitos, camelCase: notas, alarmes)')
    else if (new Set(lista).size !== lista.length) problemas.push('colecoes: nome repetido')
    if (!usaColecoes) problemas.push('colecoes declaradas sem "colecoes" em capacidades')
  } else if (usaColecoes) {
    problemas.push('capacidades pede "colecoes": liste em "colecoes" os nomes que o app abre')
  }

  // As pastas que o app LISTA e mostra no Finder (0.3.0). Salvar é livre em qualquer
  // pasta da lista; ler o que a pessoa já tem, só na pasta declarada aqui.
  const usaArquivos = Array.isArray(caps) && caps.includes('arquivos')
  if (m.pastas !== undefined) {
    const lista = m.pastas
    if (
      !Array.isArray(lista) ||
      lista.length === 0 ||
      !lista.every((p) => PASTAS_DE_ARQUIVOS.includes(p))
    )
      problemas.push(`pastas: lista com as de ${PASTAS_DE_ARQUIVOS.join(', ')}`)
    else if (new Set(lista).size !== lista.length) problemas.push('pastas: pasta repetida')
    if (!usaArquivos) problemas.push('pastas declaradas sem "arquivos" em capacidades')
  }

  // Os tipos que o app abre pelo "abrir com" do Finder (0.3.0). O arquivo chega pela
  // `abertura` e é lido com `arquivos.ler`, então as duas precisam estar declaradas.
  if (m.abre !== undefined) {
    const lista = m.abre
    if (!Array.isArray(lista) || lista.length === 0 || !lista.every(ehPadraoDeTipo))
      problemas.push('abre: lista de tipos como image/* ou application/pdf')
    else if (new Set(lista).size !== lista.length) problemas.push('abre: tipo repetido')
    const faltam = ['abertura', 'arquivos'].filter(
      (c) => !(Array.isArray(caps) && caps.includes(c)),
    )
    if (faltam.length)
      problemas.push(`abre precisa de ${faltam.map((c) => `"${c}"`).join(' e ')} em capacidades`)
  }
  return problemas
}
