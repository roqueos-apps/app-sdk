// A 0.3.0: arquivos com pastas, listar, ler e abrir a pasta; o "abrir com" pela
// abertura; um documento só pelas coleções; e a tela cheia pedida à janela.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ErroDoSistema,
  PASTAS_DE_ARQUIVOS,
  conferirPasta,
  conferirPastaDeclarada,
  conferirTipos,
  criarCofreDeRefs,
  entradaDeArquivo,
  ordenarArquivos,
  tipoCasa,
  validarManifesto,
  verificarSistema,
} from '../src/index.js'
import { criarSistemaFalso } from '../src/host/falso.js'
import { criarSistemaDeDesenvolvimento, montarNaJanelaFalsa } from '../src/host/desenvolvimento.js'
import { conferirPastasDeclaradas } from '../src/verificacao.js'
import { definirApp } from '../src/index.js'
import { janelaFalsa } from './janela-falsa.js'

const ANA = { uid: 'ana', nome: 'Ana' }
const comCodigo = (codigo) => (e) => e instanceof ErroDoSistema && e.codigo === codigo
const silencioso = { info() {}, debug() {} }
const MANIFESTO = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/app-ok/app.json', import.meta.url)), 'utf8'),
)

describe('arquivos: as pastas e os filtros', () => {
  test('as pastas são identificadores sem acento, e a lista é esta', () => {
    assert.deepEqual(PASTAS_DE_ARQUIVOS, ['Documentos', 'Imagens', 'Videos'])
    assert.equal(conferirPasta('Imagens'), 'Imagens')
    for (const ruim of ['Vídeos', 'imagens', '/Imagens', 'Raiz', undefined]) {
      assert.throws(() => conferirPasta(ruim), comCodigo('pasta-invalida'))
    }
  })

  test('listar e abrir exigem a pasta declarada; pasta fora da lista é outro erro', () => {
    assert.equal(conferirPastaDeclarada('Imagens', ['Imagens']), 'Imagens')
    assert.throws(
      () => conferirPastaDeclarada('Videos', ['Imagens']),
      comCodigo('pasta-nao-declarada'),
    )
    assert.throws(() => conferirPastaDeclarada('Raiz', ['Imagens']), comCodigo('pasta-invalida'))
  })

  test('o filtro de tipos casa grupo e tipo exato, e sem filtro é tudo', () => {
    assert.equal(conferirTipos(undefined), null)
    assert.deepEqual(conferirTipos(['image/*', 'application/pdf']), ['image/*', 'application/pdf'])
    for (const ruim of [[], 'image/*', ['image'], ['*/*x'], [1]]) {
      assert.throws(() => conferirTipos(ruim), comCodigo('valor-invalido'))
    }
    assert.equal(tipoCasa('image/png', ['image/*']), true)
    assert.equal(tipoCasa('application/pdf', ['application/pdf']), true)
    assert.equal(tipoCasa('video/mp4', ['image/*']), false)
    assert.equal(tipoCasa('video/mp4', null), true)
    assert.equal(tipoCasa(undefined, ['image/*']), false)
  })

  test('a lista sai dos mais novos para os mais velhos, e o nome desempata', () => {
    const lista = [
      { nome: 'b', modificadoEm: 1 },
      { nome: 'c', modificadoEm: 3 },
      { nome: 'a', modificadoEm: 1 },
    ]
    assert.deepEqual(
      ordenarArquivos(lista).map((a) => a.nome),
      ['c', 'a', 'b'],
    )
  })

  test('a entrada de listar tem sempre os mesmos campos, e tipo estranho vira octet-stream', () => {
    assert.deepEqual(
      { ...entradaDeArquivo({ ref: 'r', nome: 'x', tipo: 'lixo', tamanho: NaN, extra: 1 }) },
      { ref: 'r', nome: 'x', tipo: 'application/octet-stream', tamanho: null, modificadoEm: null },
    )
  })
})

describe('a forma de arquivos na 0.3.0', () => {
  test('o sistema da 0.2.0, só com salvar, não serve a app que exige arquivos: falta listar, ler e abrirPasta', () => {
    const { sistema } = criarSistemaFalso()
    const soSalvar = { ...sistema, arquivos: { salvar: sistema.arquivos.salvar } }
    assert.deepEqual(verificarSistema(soSalvar, { exigidas: ['arquivos'] }).problemas, [
      'arquivos.listar precisa ser função',
      'arquivos.ler precisa ser função',
      'arquivos.abrirPasta precisa ser função',
    ])
    assert.equal(verificarSistema(sistema, { exigidas: ['arquivos'] }).ok, true)
  })
})

describe('o cofre de refs', () => {
  test('resolve o que emitiu, e recusa a ref fabricada, a de outra sessão e o que nem é ref', () => {
    const cofre = criarCofreDeRefs({ sessao: 'hoje' })
    const ref = cofre.emitir({ caminho: '/Imagens/a.png' })
    assert.deepEqual(cofre.resolver(ref), { caminho: '/Imagens/a.png' })
    assert.throws(() => cofre.resolver('arq.hoje.fabricada'), comCodigo('ref-invalida'))
    const ontem = criarCofreDeRefs({ sessao: 'ontem' }).emitir({ caminho: '/x' })
    assert.throws(
      () => cofre.resolver(ontem),
      (e) => comCodigo('ref-invalida')(e) && /outra sessão/.test(e.message),
    )
    for (const ruim of [undefined, 42, '/Imagens/a.png', 'arq']) {
      assert.throws(() => cofre.resolver(ruim), comCodigo('ref-invalida'))
    }
  })

  test('a ref não conta onde o arquivo mora nem como ele se chama', () => {
    const cofre = criarCofreDeRefs()
    const ref = cofre.emitir({ caminho: '/Imagens/ferias.png' })
    assert.doesNotMatch(ref, /Imagens|ferias/)
  })
})

describe('arquivos no sistema falso', () => {
  const comFotos = () => {
    const f = criarSistemaFalso({ identidade: ANA, pastas: ['Imagens'] })
    f.arquivos.semear('Imagens', {
      nome: 'velha.png',
      tipo: 'image/png',
      conteudo: 'v',
      modificadoEm: 1,
    })
    f.arquivos.semear('Imagens', {
      nome: 'nova.jpg',
      tipo: 'image/jpeg',
      conteudo: 'nn',
      modificadoEm: 5,
    })
    f.arquivos.semear('Imagens', {
      nome: 'nota.txt',
      tipo: 'text/plain',
      conteudo: 't',
      modificadoEm: 9,
    })
    f.arquivos.semear('Videos', {
      nome: 'v.mp4',
      tipo: 'video/mp4',
      conteudo: 'm',
      modificadoEm: 7,
    })
    return f
  }

  test('listar a pasta declarada: os mais novos primeiro, com o filtro, e cada um com ref', async () => {
    const f = comFotos()
    const lista = await f.sistema.arquivos.listar('Imagens', { tipos: ['image/*'] })
    assert.deepEqual(
      lista.map(({ nome, tipo, tamanho, modificadoEm }) => ({ nome, tipo, tamanho, modificadoEm })),
      [
        { nome: 'nova.jpg', tipo: 'image/jpeg', tamanho: 2, modificadoEm: 5 },
        { nome: 'velha.png', tipo: 'image/png', tamanho: 1, modificadoEm: 1 },
      ],
    )
    assert.equal(await (await f.sistema.arquivos.ler(lista[0].ref)).text(), 'nn')
    assert.equal((await f.sistema.arquivos.listar('Imagens')).length, 3)
  })

  test('pasta não declarada não lista nem abre, mesmo tendo arquivo lá', async () => {
    const f = comFotos()
    await assert.rejects(f.sistema.arquivos.listar('Videos'), comCodigo('pasta-nao-declarada'))
    await assert.rejects(f.sistema.arquivos.abrirPasta('Videos'), comCodigo('pasta-nao-declarada'))
    await f.sistema.arquivos.abrirPasta('Imagens')
    assert.deepEqual(f.registro.pastasAbertas, ['Imagens'])
  })

  test('salvar é livre em qualquer pasta da lista, e a ref devolvida lê o que foi salvo', async () => {
    const f = criarSistemaFalso({ identidade: ANA, pastas: [] })
    const salvo = await f.sistema.arquivos.salvar({
      nome: 'captura.webm',
      conteudo: new Blob(['vid'], { type: 'video/webm' }),
      tipo: 'video/webm',
      pasta: 'Videos',
    })
    assert.equal(salvo.pasta, 'Videos')
    assert.equal(await (await f.sistema.arquivos.ler(salvo.ref)).text(), 'vid')
    assert.deepEqual(
      f.arquivos.guardados('Videos').map((a) => a.nome),
      ['captura.webm'],
    )
  })

  test('sem conta, listar, ler, abrir a pasta e salvar rejeitam', async () => {
    const f = criarSistemaFalso({ identidade: ANA, pastas: ['Imagens'] })
    f.arquivos.semear('Imagens', { nome: 'a.png', tipo: 'image/png' })
    const [a] = await f.sistema.arquivos.listar('Imagens')
    f.mudarIdentidade({ uid: null, nome: null })
    await assert.rejects(f.sistema.arquivos.listar('Imagens'), comCodigo('sem-conta'))
    await assert.rejects(f.sistema.arquivos.ler(a.ref), comCodigo('sem-conta'))
    await assert.rejects(f.sistema.arquivos.abrirPasta('Imagens'), comCodigo('sem-conta'))
    await assert.rejects(
      f.sistema.arquivos.salvar({ nome: 'b.txt', conteudo: 'x' }),
      comCodigo('sem-conta'),
    )
  })

  test('ref de outro sistema, e ref guardada no armazenamento de ontem, falham alto', async () => {
    const a = comFotos()
    const [foto] = await a.sistema.arquivos.listar('Imagens')
    a.sistema.armazenamento.gravar('ultima', foto.ref)
    const b = comFotos()
    await assert.rejects(b.sistema.arquivos.ler(foto.ref), comCodigo('ref-invalida'))
    // O mesmo aparelho no dia seguinte: o armazenamento sobrevive, a sessão não.
    const amanha = criarSistemaFalso({ identidade: ANA, pastas: ['Imagens'] })
    await assert.rejects(
      amanha.sistema.arquivos.ler(a.sistema.armazenamento.ler('ultima')),
      comCodigo('ref-invalida'),
    )
  })

  test('o "abrir com": o app lê o arquivo entregue sem ter declarado a pasta, e continua sem listar', async () => {
    // O visualizador não declara pasta nenhuma: o que ele vê é o que a pessoa entregou.
    const f = criarSistemaFalso({ identidade: ANA, pastas: [] })
    f.arquivos.semear('Imagens', { nome: 'outra.png', tipo: 'image/png', conteudo: 'o' })
    const pedidos = []
    const parar = f.sistema.abertura.aoMudar((p) => pedidos.push(p))
    const ref = f.abrirCom({ nome: 'praia.png', tipo: 'image/png', conteudo: 'px' })
    parar()
    assert.deepEqual(pedidos, [{ arquivo: { ref, nome: 'praia.png', tipo: 'image/png' } }])
    assert.deepEqual(f.sistema.abertura.atual(), pedidos[0])
    assert.equal(await (await f.sistema.arquivos.ler(ref)).text(), 'px')
    await assert.rejects(f.sistema.arquivos.listar('Imagens'), comCodigo('pasta-nao-declarada'))
  })
})

describe('colecoes: um documento só (0.3.0)', () => {
  test('ler traz o documento com os carimbos, null quando não existe ou sem conta', async () => {
    const f = criarSistemaFalso({ identidade: ANA, colecoes: ['quadros'], agora: () => 7 })
    const quadros = f.sistema.colecoes.abrir('quadros')
    await quadros.criar('q1', { nome: 'Plano', elementos: [{ t: 'ret' }] })
    assert.deepEqual(await quadros.ler('q1'), {
      id: 'q1',
      nome: 'Plano',
      elementos: [{ t: 'ret' }],
      criadoEm: 7,
      atualizadoEm: 7,
    })
    assert.equal(await quadros.ler('q2'), null)
    await assert.rejects(quadros.ler('a/b'), comCodigo('id-invalido'))
    f.mudarIdentidade({ uid: null, nome: null })
    assert.equal(await quadros.ler('q1'), null)
  })

  test('ler não assina: nenhum ouvinte fica preso', async () => {
    const f = criarSistemaFalso({ identidade: ANA, colecoes: ['quadros'] })
    await f.sistema.colecoes.abrir('quadros').ler('q1')
    assert.equal(f.ouvintesVivos(), 0)
  })
})

describe('janela: a tela cheia pedida ao sistema', () => {
  test('ligar e desligar dizem o estado, e o ouvinte ouve cada mudança', async () => {
    const f = criarSistemaFalso()
    const vistos = []
    const parar = f.sistema.janela.aoMudarTelaCheia((l) => vistos.push(l))
    assert.equal(f.sistema.janela.emTelaCheia(), false)
    assert.equal(await f.sistema.janela.telaCheia(true), true)
    assert.equal(f.sistema.janela.emTelaCheia(), true)
    // Pedir de novo o que já está não avisa ninguém.
    assert.equal(await f.sistema.janela.telaCheia(true), true)
    f.telaCheia.sair()
    assert.equal(f.sistema.janela.emTelaCheia(), false)
    parar()
    await f.sistema.janela.telaCheia(true)
    assert.deepEqual(vistos, [true, false])
    assert.deepEqual(f.registro.telaCheia, [true, true, true])
  })

  test('o pedido recusado resolve com o estado real, e não com o pedido', async () => {
    const f = criarSistemaFalso()
    f.telaCheia.recusar()
    assert.equal(await f.sistema.janela.telaCheia(true), false)
    assert.equal(f.sistema.janela.emTelaCheia(), false)
  })

  test('só aceita true ou false, e o ouvinte conta no desmontar', async () => {
    const f = criarSistemaFalso()
    await assert.rejects(f.sistema.janela.telaCheia('sim'), TypeError)
    assert.throws(() => f.sistema.janela.aoMudarTelaCheia(null), TypeError)
    const parar = f.sistema.janela.aoMudarTelaCheia(() => {})
    assert.equal(f.ouvintesVivos(), 1)
    parar()
    assert.equal(f.ouvintesVivos(), 0)
  })

  test('app que exige "janela" não monta num sistema sem ela, e diz qual', () => {
    const { sistema } = criarSistemaFalso()
    const semJanela = { ...sistema }
    delete semJanela.janela
    const r = verificarSistema(semJanela, { exigidas: ['janela'] })
    assert.equal(r.ok, false)
    assert.deepEqual(r.problemas, ['falta a capacidade "janela"'])
    const incompleta = { ...sistema, janela: { telaCheia() {} } }
    assert.deepEqual(verificarSistema(incompleta, { exigidas: ['janela'] }).problemas, [
      'janela.emTelaCheia precisa ser função',
      'janela.aoMudarTelaCheia precisa ser função',
    ])
  })
})

describe('app.json: pastas e abre', () => {
  const com = (extra) => ({ ...MANIFESTO, ...extra })

  test('pastas: da lista, sem repetir, e com "arquivos" em capacidades', () => {
    assert.deepEqual(validarManifesto(com({ capacidades: ['arquivos'], pastas: ['Imagens'] })), [])
    assert.deepEqual(validarManifesto(com({ capacidades: ['arquivos'], pastas: ['Vídeos'] })), [
      'pastas: lista com as de Documentos, Imagens, Videos',
    ])
    assert.deepEqual(
      validarManifesto(com({ capacidades: ['arquivos'], pastas: ['Imagens', 'Imagens'] })),
      ['pastas: pasta repetida'],
    )
    assert.deepEqual(validarManifesto(com({ pastas: ['Imagens'] })), [
      'pastas declaradas sem "arquivos" em capacidades',
    ])
  })

  test('abre: padrões de tipo, sem repetir, e com "abertura" e "arquivos"', () => {
    const caps = ['abertura', 'arquivos']
    assert.deepEqual(validarManifesto(com({ capacidades: caps, abre: ['image/*'] })), [])
    assert.deepEqual(validarManifesto(com({ capacidades: caps, abre: ['png'] })), [
      'abre: lista de tipos como image/* ou application/pdf',
    ])
    assert.deepEqual(validarManifesto(com({ capacidades: caps, abre: ['image/*', 'image/*'] })), [
      'abre: tipo repetido',
    ])
    assert.deepEqual(validarManifesto(com({ capacidades: ['arquivos'], abre: ['image/*'] })), [
      'abre precisa de "abertura" em capacidades',
    ])
    assert.deepEqual(validarManifesto(com({ abre: ['image/*'] })), [
      'abre precisa de "abertura" e "arquivos" em capacidades',
    ])
  })
})

describe('app check: a pasta escrita no código está declarada', () => {
  const FIXTURE = fileURLToPath(new URL('./fixtures/app-ok', import.meta.url))
  test('listar e abrirPasta com pasta fora de "pastas" reprovam; comentário não conta', () => {
    const p = mkdtempSync(join(tmpdir(), 'app-check-pastas-'))
    cpSync(FIXTURE, p, { recursive: true })
    writeFileSync(
      join(p, 'src', 'usa-arquivos.js'),
      [
        "export const a = (s) => s.arquivos.listar('Imagens', { tipos: ['image/*'] })",
        '// s.arquivos.abrirPasta("Documentos") no comentário não conta',
        'export const b = (s) => s.arquivos.abrirPasta(`Videos`)',
        'export const c = (s, pasta) => s.arquivos.listar(pasta)',
      ].join('\n'),
    )
    assert.deepEqual(conferirPastasDeclaradas(p), [
      'src/usa-arquivos.js:1 listar(\'Imagens\') sem "Imagens" em pastas no app.json',
      'src/usa-arquivos.js:3 abrirPasta(\'Videos\') sem "Videos" em pastas no app.json',
    ])
    const m = JSON.parse(readFileSync(join(p, 'app.json'), 'utf8'))
    m.pastas = ['Imagens', 'Videos']
    writeFileSync(join(p, 'app.json'), JSON.stringify(m))
    assert.deepEqual(conferirPastasDeclaradas(p), [])
    rmSync(p, { recursive: true })
  })
})

describe('sistema de desenvolvimento: 0.3.0', () => {
  test('lista o que a sessão salvou, abre a pasta no console e pede a tela cheia à moldura', async () => {
    const linhas = []
    const pedidos = []
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'camera',
      janela: janelaFalsa(),
      registro: { info: (l) => linhas.push(l), debug() {} },
      pastas: ['Imagens'],
      aoTelaCheia: (ligar) => (pedidos.push(ligar), ligar),
    })
    await sistema.arquivos.salvar({
      nome: 'f.png',
      conteudo: 'p',
      tipo: 'image/png',
      pasta: 'Imagens',
    })
    const [f] = await sistema.arquivos.listar('Imagens')
    assert.equal(f.nome, 'f.png')
    await sistema.arquivos.abrirPasta('Imagens')
    assert.equal(await sistema.janela.telaCheia(true), true)
    assert.deepEqual(pedidos, [true])
    assert.deepEqual(linhas, [
      '[camera] salvaria em Imagens/f.png',
      '[camera] abriria o Finder em Imagens',
    ])
  })

  test('a janela falsa do app que abre arquivo tem o "Abrir arquivo", e a tela cheia estica a moldura', async () => {
    const janela = janelaFalsa()
    let recebido = null
    const app = definirApp({
      id: 'visor',
      capacidades: ['abertura', 'arquivos', 'janela'],
      montar(el, sistema) {
        sistema.abertura.aoMudar((p) => (recebido = p))
        return { ativar() {}, desmontar() {} }
      },
    })
    const manifesto = { ...MANIFESTO, id: 'visor', abre: ['image/*'] }
    const { sistema } = montarNaJanelaFalsa(app, { manifesto, janela, registro: silencioso })
    const moldura = janela.document.body.filhos.find((e) => e.className === 'ros-dev-janela')
    const barra = moldura.filhos[0]
    const escolher = barra.filhos.find((e) => e.type === 'file')
    assert.equal(escolher.accept, 'image/*')
    escolher.files = [new File(['px'], 'praia.png', { type: 'image/png' })]
    escolher.emitir('change')
    assert.equal(recebido.arquivo.nome, 'praia.png')
    assert.equal(await (await sistema.arquivos.ler(recebido.arquivo.ref)).text(), 'px')
    await sistema.janela.telaCheia(true)
    assert.equal(moldura.classList.contains('ros-dev-janela--cheia'), true)
    janela.emitir('keydown', { key: 'Escape' })
    assert.equal(sistema.janela.emTelaCheia(), false)
    assert.equal(moldura.classList.contains('ros-dev-janela--cheia'), false)
  })
})
