// O QUE O `app check` CONFERE NUM REPO.
//
// Cada verificação existe por um motivo que já custou caro em algum lugar da
// família (a maioria veio do `jogo check`, que roda em vinte jogos). Ficam aqui,
// e não no CI de cada app, porque trinta cópias de um check divergem em três
// meses; uma chamada não. O RoqueOS roda a mesma função nos apps que ainda moram
// dentro dele, então o app que sai já sai passando.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { IDIOMAS, IDIOMA_CANONICO, IDIOMAS_OBRIGATORIOS_DA_COMUNIDADE } from './idiomas.js'
import { validarManifesto } from './manifesto.js'
import { OPCIONAIS } from './contrato.js'
import { VARIAVEIS_DO_SISTEMA } from './variaveis.js'

/**
 * Scripts que o npm e o yarn rodam sozinhos no `install`. O RoqueOS instala o
 * app como dependência; um desses scripts num app aberto rodaria na máquina de
 * quem builda o RoqueOS a cada `yarn install`. `prepare` entra porque o yarn
 * roda ele em dependência git.
 */
export const SCRIPTS_DE_INSTALACAO = Object.freeze([
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepack',
  'postpack',
])

/** Licenças que um asset pode ter para entrar num app aberto. */
export const LICENCAS_DE_ASSET = Object.freeze([
  'CC0-1.0',
  'CC-BY-4.0',
  'MIT',
  'BSD-3-Clause',
  'autoral',
])

const lerJson = (arquivo) => JSON.parse(readFileSync(arquivo, 'utf8'))
const barra = (raiz, p) => relative(raiz, p).split(sep).join('/')

export function conferirScriptsDeInstalacao(raiz) {
  const arquivo = join(raiz, 'package.json')
  if (!existsSync(arquivo)) return ['package.json ausente']
  const scripts = lerJson(arquivo).scripts ?? {}
  return SCRIPTS_DE_INSTALACAO.filter((s) => s in scripts).map(
    (s) => `package.json declara "${s}", que roda sozinho no install de quem depende deste pacote`,
  )
}

/** As chaves-folha de um objeto de textos, como caminhos: `menu.limpar`. */
export function chavesFolha(obj, prefixo = '') {
  const saida = []
  for (const [k, v] of Object.entries(obj ?? {})) {
    const caminho = prefixo ? `${prefixo}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) saida.push(...chavesFolha(v, caminho))
    else saida.push(caminho)
  }
  return saida
}

function camadaDe(raiz) {
  try {
    return lerJson(join(raiz, 'app.json')).camada ?? null
  } catch {
    return null
  }
}

export function conferirTextos(raiz) {
  const pasta = join(raiz, 'i18n')
  if (!existsSync(pasta)) return ['i18n/ ausente: o texto do app mora no app, um JSON por idioma']
  const base = join(pasta, `${IDIOMA_CANONICO}.json`)
  if (!existsSync(base)) return [`i18n/${IDIOMA_CANONICO}.json ausente: pt-BR é o idioma canônico`]
  const obrigatorios =
    camadaDe(raiz) === 'comunidade' ? IDIOMAS_OBRIGATORIOS_DA_COMUNIDADE : IDIOMAS
  const problemas = []
  const canonicas = new Set(chavesFolha(lerJson(base)))
  for (const idioma of IDIOMAS) {
    const arquivo = join(pasta, `${idioma}.json`)
    if (!existsSync(arquivo)) {
      if (obrigatorios.includes(idioma)) problemas.push(`i18n/${idioma}.json ausente`)
      continue
    }
    const conteudo = lerJson(arquivo)
    const chaves = new Set(chavesFolha(conteudo))
    const faltando = [...canonicas].filter((c) => !chaves.has(c))
    const sobrando = [...chaves].filter((c) => !canonicas.has(c))
    if (faltando.length)
      problemas.push(
        `i18n/${idioma}.json sem: ${faltando.slice(0, 5).join(', ')}${faltando.length > 5 ? ` (+${faltando.length - 5})` : ''}`,
      )
    if (sobrando.length)
      problemas.push(
        `i18n/${idioma}.json com chave que o pt-BR não tem: ${sobrando.slice(0, 5).join(', ')}`,
      )
    const vazias = chavesFolha(conteudo).filter((c) => {
      const v = c.split('.').reduce((o, k) => o?.[k], conteudo)
      return typeof v !== 'string' || v.trim() === ''
    })
    if (vazias.length)
      problemas.push(`i18n/${idioma}.json com texto vazio em: ${vazias.slice(0, 5).join(', ')}`)
  }
  const estranhos = readdirSync(pasta).filter(
    (n) => n.endsWith('.json') && !IDIOMAS.includes(n.slice(0, -5)),
  )
  if (estranhos.length)
    problemas.push(`i18n/ com idioma que a casa não fala: ${estranhos.join(', ')}`)
  return problemas
}

function arquivosDe(pasta) {
  if (!existsSync(pasta)) return []
  const saida = []
  // Em ordem: a saída do check é lida por gente e comparada em teste, e a ordem do
  // readdir muda de sistema de arquivos para sistema de arquivos.
  for (const nome of readdirSync(pasta).sort()) {
    if (nome.startsWith('.')) continue
    const p = join(pasta, nome)
    if (statSync(p).isDirectory()) saida.push(...arquivosDe(p))
    else saida.push(p)
  }
  return saida
}

function licencaDoPacote(raiz) {
  try {
    return lerJson(join(raiz, 'package.json')).license ?? null
  } catch {
    return null
  }
}

/**
 * Cada arquivo em `public/` precisa de uma linha no ASSETS.md com a licença e
 * a origem. Custou nos jogos: um modelo 3D de pacote comercial foi parar num
 * jogo sem ninguém saber de onde vinha, e um repo aberto publica o arquivo para
 * o mundo.
 */
export function conferirAssets(raiz) {
  const arquivos = arquivosDe(join(raiz, 'public')).map((p) => barra(raiz, p))
  if (arquivos.length === 0) return []
  const ledger = join(raiz, 'ASSETS.md')
  if (!existsSync(ledger)) return [`ASSETS.md ausente, e public/ tem ${arquivos.length} arquivo(s)`]
  const linhas = readFileSync(ledger, 'utf8')
    .split('\n')
    .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/`/g, '')),
    )
  const declarados = new Map(linhas.filter((c) => c.length >= 3).map((c) => [c[0], c]))
  // App fechado (`license: UNLICENSED`) não publica o arquivo para o mundo, então pode
  // levar asset de terceiro com licença de uso fora da lista. Continua obrigado a dizer
  // qual licença e de onde veio: o que não pode é não saber.
  const fechado = licencaDoPacote(raiz) === 'UNLICENSED'
  const problemas = []
  for (const a of arquivos) {
    const linha = declarados.get(a)
    if (!linha) {
      problemas.push(`${a} sem linha no ASSETS.md (caminho | licença | origem)`)
      continue
    }
    if (fechado) {
      if (!linha[1] || /^(\?|desconhecida)$/i.test(linha[1]))
        problemas.push(
          `${a} sem licença: app fechado aceita licença de terceiro, mas não "não sei"`,
        )
    } else if (!LICENCAS_DE_ASSET.includes(linha[1])) {
      problemas.push(`${a} com licença "${linha[1]}", fora de ${LICENCAS_DE_ASSET.join(', ')}`)
    }
    if (!linha[2]) problemas.push(`${a} sem origem`)
  }
  return problemas
}

/** As extensões que o `app check` lê no `src/` de um app. */
const CODIGO = /\.(m?js|cjs|jsx|mts|cts|tsx?|vue|svelte)$/
const ESTILO = /\.(s?css|sass|less)$/
const LIDO = /\.(m?js|cjs|jsx|mts|cts|tsx?|vue|svelte|s?css|sass|less)$/

/**
 * O código sem os comentários, com as quebras de linha preservadas para o
 * número da linha continuar certo. Respeita texto entre aspas e crases: um
 * 'https://…' não é comentário. Um import comentado não é import. Serve para
 * JavaScript e para SCSS, que comentam do mesmo jeito.
 */
export function semComentarios(codigo) {
  let saida = ''
  let i = 0
  while (i < codigo.length) {
    const c = codigo[i]
    const d = codigo[i + 1]
    if (c === '/' && d === '/' && codigo[i - 1] !== ':') {
      while (i < codigo.length && codigo[i] !== '\n') i++
    } else if (c === '/' && d === '*') {
      i += 2
      while (i < codigo.length && !(codigo[i] === '*' && codigo[i + 1] === '/')) {
        if (codigo[i] === '\n') saida += '\n'
        i++
      }
      i += 2
    } else if (c === "'" || c === '"' || c === '`') {
      saida += c
      i++
      while (i < codigo.length && codigo[i] !== c) {
        if (codigo[i] === '\\') {
          saida += codigo[i]
          i++
        }
        if (i < codigo.length) saida += codigo[i]
        i++
      }
      if (i < codigo.length) saida += codigo[i]
      i++
    } else {
      saida += c
      i++
    }
  }
  return saida
}

// Os jeitos de um módulo entrar: import/export … from, import 'x', import('x'),
// require('x') e, no estilo, @import, @use e @forward.
const FORMAS_DE_IMPORTAR = [
  /\bfrom\s*(['"])([^'"\n]+)\1/g,
  // O `@import 'x'` do estilo tem a forma de `import 'x'` dentro dele; ele fica com a
  // regra de baixo, senão o mesmo import sai duas vezes.
  /(?<!@)\bimport\s*(['"])([^'"\n]+)\1/g,
  /\bimport\s*\(\s*(['"`])([^'"`\n]+)\1/g,
  /\brequire\s*\(\s*(['"`])([^'"`\n]+)\1/g,
  /@(?:import|use|forward)\s+(['"])([^'"\n]+)\1/g,
]

function importsDe(raiz, arquivo) {
  const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
  const achados = new Map()
  for (const forma of FORMAS_DE_IMPORTAR) {
    for (const achado of codigo.matchAll(forma)) {
      if (!achados.has(achado.index)) achados.set(achado.index, achado[2])
    }
  }
  const onde = barra(raiz, arquivo)
  return [...achados]
    .sort((a, b) => a[0] - b[0])
    .map(([posicao, especificador]) => ({
      onde,
      linha: codigo.slice(0, posicao).split('\n').length,
      especificador,
    }))
}

/** `firebase`, `firebase/<qualquer coisa>` e os pacotes `@firebase/*` que ele reexporta. */
export const ehFirebase = (especificador) =>
  especificador === 'firebase' ||
  especificador.startsWith('firebase/') ||
  especificador.startsWith('@firebase/')

/**
 * O app não fala com banco: quem guarda é o sistema (`armazenamento`, e as
 * capacidades de conta quando nascerem). App que importa o Firebase leva a
 * configuração do projeto e as regras do banco para dentro dele, e quebra no dia
 * em que o sistema muda de banco.
 */
export function conferirBanco(raiz) {
  const problemas = []
  for (const arquivo of arquivosDe(join(raiz, 'src'))) {
    if (!CODIGO.test(arquivo)) continue
    for (const { onde, linha, especificador } of importsDe(raiz, arquivo)) {
      if (ehFirebase(especificador))
        problemas.push(
          `${onde}:${linha} importa "${especificador}": o app não fala com banco, quem guarda é o sistema`,
        )
    }
  }
  return problemas
}

/**
 * Os caminhos que só existem DENTRO do RoqueOS: os apelidos do Quasar (`src/`,
 * `stores/`, `boot/`...) e o próprio Quasar. Um app que sai do front levando um
 * `import ... from 'src/stores/roqueos'` continua compilando no RoqueOS, porque o
 * Vite de lá resolve o apelido, e aí o app "de fora" lê a store inteira em
 * silêncio. No repo do app o import quebra; é justamente por isso que o check
 * roda também nos apps que ainda moram no front.
 */
export const APELIDOS_DO_ROQUEOS = Object.freeze([
  'src/',
  'app/',
  'boot/',
  'stores/',
  'components/',
  'layouts/',
  'pages/',
  'assets/',
  'css/',
])

export const ehDoRoqueOS = (especificador) =>
  especificador === 'quasar' ||
  especificador.startsWith('quasar/') ||
  APELIDOS_DO_ROQUEOS.some((a) => especificador.startsWith(a) || especificador.startsWith(`~${a}`))

export function conferirImportsDoRoqueOS(raiz) {
  const problemas = []
  for (const arquivo of arquivosDe(join(raiz, 'src'))) {
    if (!LIDO.test(arquivo)) continue
    for (const { onde, linha, especificador } of importsDe(raiz, arquivo)) {
      if (!ehDoRoqueOS(especificador)) continue
      problemas.push(
        especificador.startsWith('quasar')
          ? `${onde}:${linha} importa "${especificador}": o app monta o próprio Vue, e o Quasar do RoqueOS não chega lá dentro (os primitivos vêm do kit de interface)`
          : `${onde}:${linha} importa "${especificador}", que só existe dentro do RoqueOS: o que o app precisa do sistema vem pelo \`sistema\``,
      )
    }
  }
  return problemas
}

/**
 * `var(--ros-...)` fora da lista do contrato (`variaveis.js`). Dependência de
 * tema que nenhum grafo de build enxerga; o motivo inteiro está lá.
 */
export function conferirVariaveis(raiz) {
  const problemas = []
  for (const arquivo of arquivosDe(join(raiz, 'src'))) {
    if (!(CODIGO.test(arquivo) || ESTILO.test(arquivo))) continue
    const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
    const onde = barra(raiz, arquivo)
    const linhaDe = (i) => codigo.slice(0, i).split('\n').length
    for (const achado of codigo.matchAll(/var\(\s*(--ros-[a-zA-Z0-9-]+)/g)) {
      if (VARIAVEIS_DO_SISTEMA.includes(achado[1])) continue
      problemas.push(
        `${onde}:${linhaDe(achado.index)} usa ${achado[1]}, que não está entre as variáveis do sistema que um app pode usar (${VARIAVEIS_DO_SISTEMA.join(', ')})`,
      )
    }
    // Declarar é pior que ler: o app está no mesmo documento, e um `--ros-white-rgb`
    // declarado no lugar errado repinta o desktop inteiro. A variável do app usa outro
    // prefixo (`--calc-fundo`), e o `--ros-` fica sendo só do sistema.
    // Também no JavaScript: `:style="{ '--ros-x': valor }"` e `setProperty('--ros-x', …)`
    // declaram do mesmo jeito.
    const declaracoes = [
      ...codigo.matchAll(/(?:^|[\s;{'"])(--ros-[a-zA-Z0-9-]+)['"]?\s*:/g),
      ...codigo.matchAll(/setProperty\(\s*['"`](--ros-[a-zA-Z0-9-]+)/g),
    ].sort((a, b) => a.index - b.index)
    for (const achado of declaracoes) {
      problemas.push(
        `${onde}:${linhaDe(achado.index + achado[0].indexOf('--ros-'))} declara ${achado[1]}: o prefixo --ros- é do sistema, a variável do app usa outro`,
      )
    }
  }
  return problemas
}

/**
 * O app que usa uma capacidade opcional sem pôr ela em `capacidades` no app.json
 * monta no `yarn dev` (o sistema de desenvolvimento tem todas) e quebra no sistema
 * que não tem aquela, com `undefined` no meio do uso, em vez da recusa com motivo
 * que o `mount` daria. Lê `sistema.x`, `sistema?.x`, `sistema['x']` e
 * `{ x } = sistema`: é o nome que o contrato usa, e o que os apps da casa seguem.
 */
export function conferirCapacidadesDeclaradas(raiz) {
  let declaradas
  try {
    declaradas = lerJson(join(raiz, 'app.json')).capacidades ?? []
  } catch {
    return [] // a seção do manifesto já reprova app.json ausente ou quebrado
  }
  if (!Array.isArray(declaradas)) return []
  const problemas = []
  for (const arquivo of arquivosDe(join(raiz, 'src'))) {
    if (!CODIGO.test(arquivo)) continue
    const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
    const onde = barra(raiz, arquivo)
    for (const cap of OPCIONAIS) {
      if (declaradas.includes(cap)) continue
      const formas = [
        new RegExp(`\\bsistema\\s*(?:\\?\\.|\\.)\\s*${cap}\\b`, 'g'),
        new RegExp(`\\bsistema\\s*(?:\\?\\.)?\\[\\s*['"\`]${cap}['"\`]`, 'g'),
        new RegExp(`\\{[^{}]*\\b${cap}\\b[^{}]*\\}\\s*=\\s*sistema\\b`, 'g'),
      ]
      const posicoes = new Set()
      for (const forma of formas) for (const a of codigo.matchAll(forma)) posicoes.add(a.index)
      for (const p of [...posicoes].sort((a, b) => a - b)) {
        problemas.push(
          `${onde}:${codigo.slice(0, p).split('\n').length} usa sistema.${cap} sem "${cap}" em capacidades no app.json`,
        )
      }
    }
  }
  return problemas
}

/**
 * A pasta que o app lista ou mostra no Finder com o nome escrito no código
 * (`arquivos.listar('Imagens')`, `abrirPasta('Videos')`) precisa estar em `pastas`
 * no app.json. Sem isto, o `yarn dev` do app declara uma lista e o código usa
 * outra, e a recusa (`pasta-nao-declarada`) só aparece no RoqueOS. Pasta montada em
 * tempo de execução o check não vê; o sistema recusa do mesmo jeito.
 */
export function conferirPastasDeclaradas(raiz) {
  let declaradas
  try {
    declaradas = lerJson(join(raiz, 'app.json')).pastas ?? []
  } catch {
    return []
  }
  if (!Array.isArray(declaradas)) return []
  const problemas = []
  const uso = /\b(listar|abrirPasta)\s*\(\s*(['"`])([A-Za-z]+)\2/g
  for (const arquivo of arquivosDe(join(raiz, 'src'))) {
    if (!CODIGO.test(arquivo)) continue
    const codigo = semComentarios(readFileSync(arquivo, 'utf8'))
    for (const a of codigo.matchAll(uso)) {
      if (declaradas.includes(a[3])) continue
      const linha = codigo.slice(0, a.index).split('\n').length
      problemas.push(
        `${barra(raiz, arquivo)}:${linha} ${a[1]}('${a[3]}') sem "${a[3]}" em pastas no app.json`,
      )
    }
  }
  return problemas
}

export function conferirManifesto(raiz) {
  const arquivo = join(raiz, 'app.json')
  if (!existsSync(arquivo)) return ['app.json ausente']
  let m
  try {
    m = lerJson(arquivo)
  } catch (e) {
    return [`app.json não é JSON válido: ${e.message}`]
  }
  const problemas = validarManifesto(m).map((p) => `app.json: ${p}`)
  if (typeof m.icone === 'string' && m.icone.endsWith('.svg') && !existsSync(join(raiz, m.icone)))
    problemas.push(`app.json: icone aponta para ${m.icone}, que não existe`)
  return problemas
}

/**
 * Tudo o que se confere num repo. `sdk` é o próprio SDK, que não é app: nele
 * só vale a regra dos scripts de instalação. `semPackage` é o app que ainda mora
 * dentro do RoqueOS e não tem package.json próprio.
 * @returns {{ secao: string, problemas: string[] }[]}
 */
export function verificarRepo(raiz, { sdk = false, semPackage = false } = {}) {
  const secoes = semPackage
    ? []
    : [{ secao: 'scripts de instalação', problemas: conferirScriptsDeInstalacao(raiz) }]
  if (!sdk) {
    secoes.push(
      { secao: 'manifesto', problemas: conferirManifesto(raiz) },
      { secao: 'textos nos idiomas', problemas: conferirTextos(raiz) },
      { secao: 'origem dos assets', problemas: conferirAssets(raiz) },
      { secao: 'o app não fala com banco', problemas: conferirBanco(raiz) },
      { secao: 'o app não importa o RoqueOS', problemas: conferirImportsDoRoqueOS(raiz) },
      { secao: 'variáveis do sistema no contrato', problemas: conferirVariaveis(raiz) },
      {
        secao: 'capacidades opcionais declaradas',
        problemas: conferirCapacidadesDeclaradas(raiz),
      },
      { secao: 'pastas declaradas', problemas: conferirPastasDeclaradas(raiz) },
    )
  }
  return secoes
}
