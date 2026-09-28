// A CAPACIDADE `arquivos`: os Arquivos da pessoa (o Finder), sem o app saber onde
// nem como eles moram.
//
//   const { nome, pasta, ref } = await sistema.arquivos.salvar({
//     nome: 'foto.png', conteudo: blob, tipo: 'image/png', pasta: 'Imagens',
//   })
//   const recentes = await sistema.arquivos.listar('Imagens', { tipos: ['image/*'] })
//   const blob = await sistema.arquivos.ler(recentes[0].ref)
//   await sistema.arquivos.abrirPasta('Imagens')
//
// - `pasta` é uma das `PASTAS_DE_ARQUIVOS`: um identificador, e não um caminho.
//   Onde ela mora e o nome que a pessoa vê em cada idioma são do sistema. A lista
//   cresce com o primeiro app que precisa de outra.
// - Salvar em qualquer pasta da lista é livre. LISTAR e ABRIR A PASTA no Finder, só
//   a pasta que o app declara em `pastas` no app.json: a Câmera vê as Imagens, e
//   não a conta inteira da pessoa. Pasta não declarada rejeita com
//   `pasta-nao-declarada`.
// - O app nunca vê caminho. `salvar` e `listar` devolvem uma `ref`, e `ler(ref)`
//   devolve o conteúdo como Blob. A ref é opaca, vale só para este app nesta
//   sessão e não se guarda no `armazenamento`: a de ontem falha com
//   `ref-invalida` em vez de abrir outra coisa. Para lembrar um arquivo, o app
//   lembra o nome e lista de novo.
// - O "abrir com" do Finder entrega UMA ref pela `abertura`
//   (`{ arquivo: { ref, nome, tipo } }`) ao app que declara o tipo em `abre` no
//   app.json. Esse arquivo o app lê mesmo sem ter declarado a pasta dele: quem
//   concedeu foi a pessoa, ao escolher o app. É o diálogo de abrir de um sistema
//   operacional, e não uma permissão para a pasta.
// - Salvar de novo com o mesmo nome guarda outro arquivo; nada é sobrescrito.
// - Sem conta, tudo rejeita com `sem-conta`.
//
// Nasceu na 0.2.0 só com `salvar` (as Notas); `listar`, `ler`, `abrirPasta` e as
// pastas `Imagens` e `Videos` chegaram na 0.3.0, com a Câmera, a Captura de tela e
// os visualizadores.

import { ErroDoSistema } from './erros.js'

/**
 * As pastas, pelo identificador. Sem acento de propósito: é chave de contrato, não
 * texto de tela (o rótulo que a pessoa lê, nos dez idiomas, é do sistema).
 */
export const PASTAS_DE_ARQUIVOS = Object.freeze(['Documentos', 'Imagens', 'Videos'])

const NOME_DE_ARQUIVO = /^[^/\\\0]{1,200}$/
const MIME = /^[\w.+-]+\/[\w.+-]+$/
/** `image/png`, `image/*` ou `application/pdf`: o que `abre` e `listar` aceitam. */
const PADRAO_DE_TIPO = /^[\w.+-]+\/(?:\*|[\w.+-]+)$/

/**
 * Confere o pedido de `salvar` e devolve os valores com o padrão aplicado.
 * @param {{ nome?: unknown, conteudo?: unknown, tipo?: unknown, pasta?: unknown }} pedido
 */
export function conferirArquivo({
  nome,
  conteudo,
  tipo = 'text/plain',
  pasta = 'Documentos',
} = {}) {
  if (typeof nome !== 'string' || !NOME_DE_ARQUIVO.test(nome) || !nome.trim()) {
    throw new ErroDoSistema(
      'valor-invalido',
      `nome de arquivo ${JSON.stringify(nome)}: sem barra, até 200`,
    )
  }
  const ehBlob = typeof Blob !== 'undefined' && conteudo instanceof Blob
  if (typeof conteudo !== 'string' && !ehBlob) {
    throw new ErroDoSistema('valor-invalido', 'conteudo é texto ou Blob')
  }
  if (typeof tipo !== 'string' || !MIME.test(tipo)) {
    throw new ErroDoSistema(
      'valor-invalido',
      `tipo ${JSON.stringify(tipo)}: um MIME como text/markdown`,
    )
  }
  conferirPasta(pasta)
  return { nome: nome.trim(), conteudo, tipo, pasta }
}

/** A pasta existe no contrato? Devolve a pasta, ou rejeita com `pasta-invalida`. */
export function conferirPasta(pasta) {
  if (!PASTAS_DE_ARQUIVOS.includes(pasta)) {
    throw new ErroDoSistema(
      'pasta-invalida',
      `pasta ${JSON.stringify(pasta)}: uma de ${PASTAS_DE_ARQUIVOS.join(', ')}`,
    )
  }
  return pasta
}

/**
 * A pasta existe E o app a declarou em `pastas`? É o que `listar` e `abrirPasta`
 * perguntam antes de mostrar qualquer coisa.
 * @param {unknown} pasta
 * @param {readonly string[]} declaradas as `pastas` do app.json
 */
export function conferirPastaDeclarada(pasta, declaradas) {
  conferirPasta(pasta)
  if (!declaradas.includes(pasta)) {
    throw new ErroDoSistema(
      'pasta-nao-declarada',
      `o app não declarou "${pasta}" em "pastas" no app.json (declarou: ${declaradas.join(', ') || 'nenhuma'})`,
    )
  }
  return pasta
}

/** Padrão de tipo válido: `image/png`, `image/*`. */
export const ehPadraoDeTipo = (v) => typeof v === 'string' && PADRAO_DE_TIPO.test(v)

/**
 * O filtro de `listar(pasta, { tipos })`: lista de padrões. Sem filtro, tudo.
 * @param {unknown} tipos
 * @returns {string[] | null}
 */
export function conferirTipos(tipos) {
  if (tipos === undefined || tipos === null) return null
  if (!Array.isArray(tipos) || tipos.length === 0 || !tipos.every(ehPadraoDeTipo)) {
    throw new ErroDoSistema(
      'valor-invalido',
      `tipos ${JSON.stringify(tipos)}: lista de padrões como image/* ou application/pdf`,
    )
  }
  return [...tipos]
}

/** O tipo do arquivo casa com algum dos padrões? `image/*` casa com `image/png`. */
export function tipoCasa(tipo, padroes) {
  if (!padroes) return true
  if (typeof tipo !== 'string') return false
  const [grupo] = tipo.split('/')
  return padroes.some((p) => p === tipo || p === `${grupo}/*`)
}

/** Os mais novos primeiro, e o nome desempata: a ordem que `listar` promete. */
export function ordenarArquivos(lista) {
  return [...lista].sort(
    (a, b) => (b.modificadoEm ?? 0) - (a.modificadoEm ?? 0) || a.nome.localeCompare(b.nome),
  )
}

const aleatorio = () => {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID().replaceAll('-', '')
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

/**
 * O COFRE DE REFS: o que torna a ref opaca de verdade, e não um caminho disfarçado.
 *
 * Cada sistema cria o seu, preso a um app e a uma sessão. `emitir` guarda o que o
 * sistema precisa para achar o arquivo (o caminho, o id no banco, o Blob) e
 * devolve uma ref aleatória; `resolver` devolve de volta, ou rejeita com
 * `ref-invalida` quando a ref não saiu DESTE cofre. A ref leva a sessão no texto,
 * para a de outra sessão (guardada ontem no armazenamento) dizer isso na mensagem.
 * Os três sistemas usam este mesmo cofre.
 */
export function criarCofreDeRefs({ sessao = aleatorio().slice(0, 12) } = {}) {
  const guardadas = new Map()
  const prefixo = `arq.${sessao}.`
  return Object.freeze({
    sessao,
    /** @param {object} entrada o que o sistema precisa para achar o arquivo depois */
    emitir(entrada) {
      const ref = `${prefixo}${aleatorio()}`
      guardadas.set(ref, entrada)
      return ref
    },
    /** @param {unknown} ref */
    resolver(ref) {
      if (typeof ref !== 'string' || !ref.startsWith('arq.')) {
        throw new ErroDoSistema('ref-invalida', `${JSON.stringify(ref)} não é uma ref de arquivo`)
      }
      if (!ref.startsWith(prefixo)) {
        throw new ErroDoSistema(
          'ref-invalida',
          'ref de outra sessão: ref não se guarda, liste a pasta de novo',
        )
      }
      if (!guardadas.has(ref)) {
        throw new ErroDoSistema('ref-invalida', 'ref que este sistema não emitiu')
      }
      return guardadas.get(ref)
    },
    /** Quantas refs estão guardadas, para o teste. */
    tamanho: () => guardadas.size,
  })
}

/** Uma entrada de `listar`, com os campos na ordem e o tipo certo. */
export const entradaDeArquivo = ({ ref, nome, tipo, tamanho, modificadoEm }) =>
  Object.freeze({
    ref,
    nome: String(nome),
    tipo: typeof tipo === 'string' && MIME.test(tipo) ? tipo : 'application/octet-stream',
    tamanho: Number.isFinite(tamanho) ? tamanho : null,
    modificadoEm: Number.isFinite(modificadoEm) ? modificadoEm : null,
  })
