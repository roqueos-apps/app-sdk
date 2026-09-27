import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  verificarRepo,
  conferirImportsDoRoqueOS,
  conferirVariaveis,
  conferirBanco,
  conferirTextos,
  conferirAssets,
  conferirScriptsDeInstalacao,
  conferirManifesto,
  semComentarios,
  ehDoRoqueOS,
} from '../src/verificacao.js'

const FIXTURE = fileURLToPath(new URL('./fixtures/app-ok', import.meta.url))

/** Uma cópia do app de teste para estragar à vontade. */
function copia(estragar) {
  const pasta = mkdtempSync(join(tmpdir(), 'app-check-'))
  cpSync(FIXTURE, pasta, { recursive: true })
  estragar?.(pasta)
  return pasta
}
const escrever = (pasta, rel, conteudo) => {
  mkdirSync(join(pasta, rel, '..'), { recursive: true })
  writeFileSync(join(pasta, rel), conteudo)
}

describe('o app de teste passa inteiro', () => {
  test('todas as seções sem problema', () => {
    const secoes = verificarRepo(FIXTURE)
    assert.deepEqual(
      secoes.map((s) => s.secao),
      [
        'scripts de instalação',
        'manifesto',
        'textos nos idiomas',
        'origem dos assets',
        'o app não fala com banco',
        'o app não importa o RoqueOS',
        'variáveis do sistema no contrato',
      ],
    )
    for (const s of secoes) assert.deepEqual(s.problemas, [], s.secao)
  })

  test('--sdk só olha os scripts; semPackage pula o package.json', () => {
    assert.deepEqual(
      verificarRepo(FIXTURE, { sdk: true }).map((s) => s.secao),
      ['scripts de instalação'],
    )
    assert.ok(
      !verificarRepo(FIXTURE, { semPackage: true }).some(
        (s) => s.secao === 'scripts de instalação',
      ),
    )
  })
})

describe('cada regra reprova o que diz', () => {
  test('script de instalação', () => {
    const p = copia((d) => {
      const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'))
      pkg.scripts.prepare = 'node x.js'
      writeFileSync(join(d, 'package.json'), JSON.stringify(pkg))
    })
    assert.deepEqual(conferirScriptsDeInstalacao(p), [
      'package.json declara "prepare", que roda sozinho no install de quem depende deste pacote',
    ])
    rmSync(p, { recursive: true })
  })

  test('manifesto: ícone SVG que não existe', () => {
    const p = copia((d) => rmSync(join(d, 'public/icone.svg')))
    assert.deepEqual(conferirManifesto(p), [
      'app.json: icone aponta para public/icone.svg, que não existe',
    ])
    rmSync(p, { recursive: true })
  })

  test('textos: chave faltando, sobrando, vazia, idioma estranho e idioma ausente', () => {
    const p = copia((d) => {
      writeFileSync(join(d, 'i18n/de-DE.json'), JSON.stringify({ titulo: 'Zähler' }))
      writeFileSync(
        join(d, 'i18n/fr-FR.json'),
        JSON.stringify({ titulo: 'x', somar: 'y', extra: 'z' }),
      )
      writeFileSync(join(d, 'i18n/es-ES.json'), JSON.stringify({ titulo: ' ', somar: 'y' }))
      writeFileSync(join(d, 'i18n/pt-PT.json'), '{}')
      rmSync(join(d, 'i18n/hi-IN.json'))
    })
    assert.deepEqual(conferirTextos(p), [
      'i18n/es-ES.json com texto vazio em: titulo',
      'i18n/fr-FR.json com chave que o pt-BR não tem: extra',
      'i18n/de-DE.json sem: somar',
      'i18n/hi-IN.json ausente',
      'i18n/ com idioma que a casa não fala: pt-PT.json',
    ])
    rmSync(p, { recursive: true })
  })

  test('textos: app de comunidade sem os oito opcionais passa', () => {
    const p = copia((d) => {
      const m = JSON.parse(readFileSync(join(d, 'app.json'), 'utf8'))
      m.camada = 'comunidade'
      writeFileSync(join(d, 'app.json'), JSON.stringify(m))
      for (const i of ['es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN', 'hi-IN', 'ru-RU', 'ar-AR'])
        rmSync(join(d, `i18n/${i}.json`))
    })
    assert.deepEqual(conferirTextos(p), [])
    rmSync(p, { recursive: true })
  })

  test('assets: arquivo sem linha e licença fora da lista', () => {
    const p = copia((d) => {
      writeFileSync(join(d, 'public/fundo.png'), 'x')
      writeFileSync(
        join(d, 'ASSETS.md'),
        '| Arquivo | Licença | Origem |\n| --- | --- | --- |\n| `public/icone.svg` | CC-BY-NC-4.0 | site |\n',
      )
    })
    assert.deepEqual(conferirAssets(p), [
      'public/fundo.png sem linha no ASSETS.md (caminho | licença | origem)',
      'public/icone.svg com licença "CC-BY-NC-4.0", fora de CC0-1.0, CC-BY-4.0, MIT, BSD-3-Clause, autoral',
    ])
    rmSync(p, { recursive: true })
  })

  test('banco: o firebase em qualquer forma de import, e não no comentário', () => {
    const p = copia((d) =>
      escrever(
        d,
        'src/banco.js',
        "// import 'firebase/app'\nimport { getFirestore } from 'firebase/firestore'\nconst x = await import('@firebase/auth')\n",
      ),
    )
    assert.deepEqual(conferirBanco(p), [
      'src/banco.js:2 importa "firebase/firestore": o app não fala com banco, quem guarda é o sistema',
      'src/banco.js:3 importa "@firebase/auth": o app não fala com banco, quem guarda é o sistema',
    ])
    rmSync(p, { recursive: true })
  })

  test('RoqueOS: apelido do Quasar no JS, no .vue e no SCSS, e o próprio Quasar', () => {
    const p = copia((d) => {
      escrever(d, 'src/a.js', "import { useRoqueOSStore } from 'src/stores/roqueos'\n")
      escrever(
        d,
        'src/B.vue',
        "<script setup>\nimport { QBtn } from 'quasar'\n</script>\n<style lang=\"scss\">\n@import 'src/css/roqueos/tokens.scss';\n</style>\n",
      )
      escrever(d, 'src/c.scss', "@use '~css/app' as *;\n")
    })
    const problemas = conferirImportsDoRoqueOS(p)
    assert.equal(problemas.length, 4, problemas.join('\n'))
    assert.match(problemas[0], /^src\/B\.vue:2 importa "quasar": o app monta o próprio Vue/)
    assert.match(
      problemas[1],
      /^src\/B\.vue:5 importa "src\/css\/roqueos\/tokens\.scss", que só existe dentro do RoqueOS/,
    )
    assert.match(problemas[2], /^src\/a\.js:1 importa "src\/stores\/roqueos"/)
    assert.match(problemas[3], /^src\/c\.scss:1 importa "~css\/app"/)
    rmSync(p, { recursive: true })
  })

  test('RoqueOS: pacote de verdade e caminho relativo passam', () => {
    for (const ok of [
      'vue',
      './estilo.css',
      '../i18n/pt-BR.json?raw',
      '@roqueos-apps/app-sdk',
      'srcset',
    ])
      assert.equal(ehDoRoqueOS(ok), false, ok)
    for (const ruim of ['src/x', 'stores/y', 'quasar/src/z', 'boot/i18n', '~src/a'])
      assert.equal(ehDoRoqueOS(ruim), true, ruim)
  })

  test('variáveis: fora da lista, e declarar --ros-* no CSS e no JavaScript', () => {
    const p = copia((d) => {
      escrever(
        d,
        'src/x.scss',
        '.a {\n  color: var(--ros-accent);\n  --ros-white-rgb: 1, 2, 3;\n}\n',
      )
      escrever(
        d,
        'src/y.js',
        "el.style.setProperty('--ros-black-rgb', '0,0,0')\nconst s = { '--ros-border-dim': 'red' }\n",
      )
    })
    assert.deepEqual(conferirVariaveis(p), [
      'src/x.scss:2 usa --ros-accent, que não está entre as variáveis do sistema que um app pode usar (--ros-white-rgb, --ros-black-rgb, --ros-border-dim)',
      'src/x.scss:3 declara --ros-white-rgb: o prefixo --ros- é do sistema, a variável do app usa outro',
      'src/y.js:1 declara --ros-black-rgb: o prefixo --ros- é do sistema, a variável do app usa outro',
      'src/y.js:2 declara --ros-border-dim: o prefixo --ros- é do sistema, a variável do app usa outro',
    ])
    rmSync(p, { recursive: true })
  })
})

describe('semComentarios', () => {
  test('tira // e /* */ e guarda as quebras de linha', () => {
    assert.equal(semComentarios('a // b\nc /* d\ne */ f'), 'a \nc \n f')
  })
  test('não confunde endereço entre aspas nem url() sem aspas com comentário', () => {
    assert.equal(semComentarios("const u = 'https://x.y' // fim"), "const u = 'https://x.y' ")
    assert.equal(
      semComentarios('background: url(https://x.y/a.png);'),
      'background: url(https://x.y/a.png);',
    )
  })
})
