import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ErroDoSistema,
  CARIMBOS,
  conferirCampos,
  conferirIdDeDocumento,
  conferirArquivo,
  conferirPedidoDeIa,
  criarAbertura,
  validarManifesto,
  verificarSistema,
} from '../src/index.js'
import { criarSistemaFalso } from '../src/host/falso.js'
import {
  criarSistemaDeDesenvolvimento,
  CONTA_DE_DESENVOLVIMENTO,
} from '../src/host/desenvolvimento.js'
import { janelaFalsa } from './janela-falsa.js'

const silencioso = { info() {}, debug() {} }
const ANA = { uid: 'ana', nome: 'Ana' }
/** Rejeita com ErroDoSistema daquele código. */
const comCodigo = (codigo) => (e) => e instanceof ErroDoSistema && e.codigo === codigo

describe('colecoes: os campos que o app grava', () => {
  test('dado simples passa, e volta uma cópia', () => {
    const campos = { titulo: 'a', n: 1, fixa: true, nada: null, tags: ['x'], pos: { x: 1 } }
    const copia = conferirCampos(campos)
    assert.deepEqual(copia, campos)
    assert.notEqual(copia.tags, campos.tags)
  })

  test('carimbo, id e nome reservado do banco são do sistema', () => {
    for (const c of [...CARIMBOS, 'id']) {
      assert.throws(() => conferirCampos({ [c]: 1 }), comCodigo('campo-do-sistema'))
    }
    assert.throws(
      () => conferirCampos({ createdAt: 1 }, { reservados: ['createdAt'] }),
      comCodigo('campo-do-sistema'),
    )
  })

  test('undefined, Date, NaN, função e objeto de classe não são dado simples', () => {
    for (const ruim of [undefined, new Date(), Number.NaN, () => {}, new Map()]) {
      assert.throws(() => conferirCampos({ x: ruim }), comCodigo('valor-invalido'))
    }
    assert.throws(() => conferirCampos({ lista: [1, undefined] }), /lista\[1\]/)
    assert.throws(() => conferirCampos(['a']), comCodigo('valor-invalido'))
  })

  test('id de documento: letras, dígitos, _ e -', () => {
    assert.equal(conferirIdDeDocumento('note_1727_a-b'), 'note_1727_a-b')
    for (const ruim of ['', 'a/b', 'a b', 1, 'x'.repeat(129)]) {
      assert.throws(() => conferirIdDeDocumento(ruim), comCodigo('id-invalido'))
    }
  })
})

describe('colecoes no sistema falso (a semântica do RoqueOS)', () => {
  const criar = (opcoes = {}) => {
    let t = 1000
    return criarSistemaFalso({
      appId: 'notes',
      identidade: ANA,
      colecoes: ['notas'],
      agora: () => (t += 10),
      ...opcoes,
    })
  }

  test('o sistema carimba as datas em ms, e o documento chega com id', async () => {
    const f = criar()
    const vistas = []
    f.sistema.colecoes.abrir('notas').observar((docs) => vistas.push(docs))
    await f.sistema.colecoes.abrir('notas').criar('n1', { titulo: 'oi' })
    assert.deepEqual(vistas, [[], [{ id: 'n1', titulo: 'oi', criadoEm: 1010, atualizadoEm: 1010 }]])
  })

  test('atualizar troca só os campos enviados: o post-it e as Notas não se apagam', async () => {
    const f = criar()
    f.colecoes.semear('notas', 'ana', [{ id: 'p1', x: 40, y: 90, content: 'a', tags: ['t'] }])
    const notas = f.sistema.colecoes.abrir('notas')
    await notas.atualizar('p1', { content: 'b' })
    const [doc] = f.colecoes.guardado('notas', 'ana')
    assert.deepEqual(
      { x: doc.x, y: doc.y, tags: doc.tags, content: doc.content },
      { x: 40, y: 90, tags: ['t'], content: 'b' },
    )
    assert.equal(doc.atualizadoEm, 1010)
  })

  test('documento antigo sem carimbo chega com null, nunca sem a chave', () => {
    const f = criar()
    f.colecoes.semear('notas', 'ana', [{ id: 'velho', title: 'x' }])
    let docs
    f.sistema.colecoes.abrir('notas').observar((d) => (docs = d))
    assert.deepEqual(docs, [{ id: 'velho', title: 'x', criadoEm: null, atualizadoEm: null }])
  })

  test('apagar some da lista de quem observa', async () => {
    const f = criar()
    f.colecoes.semear('notas', 'ana', [{ id: 'a' }, { id: 'b' }])
    let docs
    f.sistema.colecoes.abrir('notas').observar((d) => (docs = d))
    await f.sistema.colecoes.abrir('notas').apagar('a')
    assert.deepEqual(
      docs.map((d) => d.id),
      ['b'],
    )
  })

  test('o app que manda o carimbo recebe campo-do-sistema, e nada é gravado', async () => {
    const f = criar()
    await assert.rejects(
      f.sistema.colecoes.abrir('notas').criar('n', { atualizadoEm: 5 }),
      comCodigo('campo-do-sistema'),
    )
    assert.deepEqual(f.colecoes.guardado('notas', 'ana'), [])
  })

  test('coleção fora do mapa não abre', () => {
    const f = criar()
    assert.throws(() => f.sistema.colecoes.abrir('lixo'), comCodigo('colecao-desconhecida'))
  })

  test('sem conta: a lista é vazia e gravar rejeita, nunca finge', async () => {
    const f = criar({ identidade: { uid: null, nome: null } })
    let docs
    f.sistema.colecoes.abrir('notas').observar((d) => (docs = d))
    assert.deepEqual(docs, [])
    await assert.rejects(f.sistema.colecoes.abrir('notas').criar('n', {}), comCodigo('sem-conta'))
    await assert.rejects(
      f.sistema.colecoes.abrir('notas').atualizar('n', {}),
      comCodigo('sem-conta'),
    )
    await assert.rejects(f.sistema.colecoes.abrir('notas').apagar('n'), comCodigo('sem-conta'))
  })

  test('a lista segue a conta: entrar e sair troca o que o app vê sem ele refazer nada', () => {
    const f = criar({ identidade: { uid: null, nome: null } })
    f.colecoes.semear('notas', 'ana', [{ id: 'da-ana' }])
    const vistas = []
    f.sistema.colecoes.abrir('notas').observar((d) => vistas.push(d.map((x) => x.id)))
    f.mudarIdentidade(ANA)
    f.mudarIdentidade({ uid: null, nome: null })
    assert.deepEqual(vistas, [[], ['da-ana'], []])
  })

  test('parar solta o ouvinte, e o teste do desmontar vê voltar a zero', () => {
    const f = criar()
    const parar = f.sistema.colecoes.abrir('notas').observar(() => {})
    assert.equal(f.ouvintesVivos(), 1)
    parar()
    assert.equal(f.ouvintesVivos(), 0)
  })
})

describe('ia', () => {
  const ancora = { appendChild() {} }

  test('pedido errado diz tudo o que está errado de uma vez', () => {
    assert.throws(
      () => conferirPedidoDeIa({ tipo: 'poema', acento: 'laranja' }),
      (e) =>
        e.codigo === 'valor-invalido' &&
        /ancora/.test(e.message) &&
        /tipo/.test(e.message) &&
        /contexto/.test(e.message) &&
        /acento/.test(e.message),
    )
  })

  test('um painel por janela: abrir outro fecha o anterior e avisa o app', () => {
    const f = criarSistemaFalso()
    const fechados = []
    f.sistema.ia.abrirPainel({
      ancora,
      tipo: 'text',
      contexto: () => 'a',
      aoFechar: () => fechados.push(1),
    })
    f.sistema.ia.abrirPainel({
      ancora,
      tipo: 'read',
      contexto: () => 'b',
      aoFechar: () => fechados.push(2),
    })
    assert.deepEqual(fechados, [1])
    assert.deepEqual(f.ia.aberto(), {
      tipo: 'read',
      acento: null,
      titulo: null,
      aplica: false,
      acoes: [],
      aberto: true,
    })
  })

  test('as ações do app (0.3.0) chegam conferidas, e erradas dizem o que está errado', () => {
    const temas = {
      id: 'temas',
      rotulo: 'Agrupar em temas',
      prompt: 'Agrupe...',
      icone: 'category',
    }
    const acoes = [temas, { id: 'acoes', rotulo: 'Tirar as ações', prompt: 'Extraia...' }]
    const p = conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '', acoes })
    assert.deepEqual(p.acoes, [
      temas,
      { id: 'acoes', rotulo: 'Tirar as ações', prompt: 'Extraia...' },
    ])
    assert.equal(Object.isFrozen(p.acoes[0]), true)
    // Os limites valem inteiros: seis ações, rótulo de 60 e pedido de 2000 passam.
    const noLimite = Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`,
      rotulo: 'x'.repeat(60),
      prompt: 'y'.repeat(2000),
    }))
    assert.equal(
      conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '', acoes: noLimite }).acoes
        .length,
      6,
    )
    assert.equal('acoes' in conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '' }), false)
    const f = criarSistemaFalso()
    f.sistema.ia.abrirPainel({ ancora, tipo: 'read', contexto: () => '', acoes })
    assert.deepEqual(f.ia.aberto().acoes, ['temas', 'acoes'])
    const ruins = [
      [{ ...temas, id: 'Temas' }, /acoes\[0\]\.id/],
      [{ ...temas, rotulo: '' }, /acoes\[0\]\.rotulo/],
      [{ ...temas, rotulo: 'x'.repeat(61) }, /acoes\[0\]\.rotulo/],
      [{ ...temas, prompt: ' ' }, /acoes\[0\]\.prompt/],
      [{ ...temas, prompt: 'x'.repeat(2001) }, /acoes\[0\]\.prompt/],
      [{ ...temas, icone: 'Category Icon' }, /acoes\[0\]\.icone/],
    ]
    for (const [acao, padrao] of ruins) {
      assert.throws(
        () => conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '', acoes: [acao] }),
        (e) => e.codigo === 'valor-invalido' && padrao.test(e.message),
        padrao.source,
      )
    }
    assert.throws(
      () => conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '', acoes: [temas, temas] }),
      /acoes\[1\]\.id/,
    )
    assert.throws(
      () =>
        conferirPedidoDeIa({
          ancora,
          tipo: 'read',
          contexto: () => '',
          acoes: Array.from({ length: 7 }, (_, i) => ({ ...temas, id: `a${i}` })),
        }),
      /até 6/,
    )
    assert.throws(
      () => conferirPedidoDeIa({ ancora, tipo: 'read', contexto: () => '', acoes: 'temas' }),
      /acoes: lista/,
    )
  })

  test('a pessoa aplica o resultado no app, e fecha', async () => {
    const f = criarSistemaFalso()
    let texto = 'rascunho'
    let fechou = false
    f.sistema.ia.abrirPainel({
      ancora,
      tipo: 'text',
      contexto: () => texto,
      aplicar: (novo) => (texto = novo),
      acento: '#f59e0b',
      aoFechar: () => (fechou = true),
    })
    assert.equal(await f.ia.contexto(), 'rascunho')
    f.ia.aplicar('texto melhor')
    assert.equal(texto, 'texto melhor')
    f.ia.fechar()
    assert.equal(fechou, true)
    assert.equal(f.ia.aberto(), null)
    assert.equal(f.registro.paineis[0].aberto, false)
  })

  test('fechar pelo app é idempotente, e o fechar de um painel velho não fecha o novo', () => {
    const f = criarSistemaFalso()
    const velho = f.sistema.ia.abrirPainel({ ancora, tipo: 'text', contexto: () => '' })
    f.sistema.ia.abrirPainel({ ancora, tipo: 'code', contexto: () => '' })
    velho.fechar()
    assert.equal(f.ia.aberto()?.tipo, 'code')
  })
})

describe('arquivos', () => {
  test('confere nome, conteúdo, tipo e pasta, com Documentos por padrão', () => {
    assert.deepEqual(conferirArquivo({ nome: ' a.md ', conteudo: '# a' }), {
      nome: 'a.md',
      conteudo: '# a',
      tipo: 'text/plain',
      pasta: 'Documentos',
    })
    assert.throws(
      () => conferirArquivo({ nome: 'a/b.md', conteudo: '' }),
      comCodigo('valor-invalido'),
    )
    assert.throws(() => conferirArquivo({ nome: 'a.md', conteudo: 1 }), comCodigo('valor-invalido'))
    assert.throws(
      () => conferirArquivo({ nome: 'a.md', conteudo: '', tipo: 'markdown' }),
      comCodigo('valor-invalido'),
    )
    assert.throws(
      () => conferirArquivo({ nome: 'a.md', conteudo: '', pasta: '../../etc' }),
      comCodigo('pasta-invalida'),
    )
  })

  test('no falso: sem conta rejeita; com conta registra e devolve onde ficou', async () => {
    const convidado = criarSistemaFalso()
    await assert.rejects(
      convidado.sistema.arquivos.salvar({ nome: 'a.md', conteudo: 'x' }),
      comCodigo('sem-conta'),
    )
    const f = criarSistemaFalso({ identidade: ANA })
    const salvo = await f.sistema.arquivos.salvar({
      nome: 'a.md',
      conteudo: 'x',
      tipo: 'text/markdown',
    })
    assert.deepEqual(
      { ...salvo, ref: typeof salvo.ref },
      {
        nome: 'a.md',
        pasta: 'Documentos',
        ref: 'string',
      },
    )
    assert.equal(f.registro.arquivos.length, 1)
    // A ref de salvar lê o que foi salvo (0.3.0).
    assert.equal(await (await f.sistema.arquivos.ler(salvo.ref)).text(), 'x')
  })
})

describe('abertura', () => {
  test('atual devolve cópia, aoMudar avisa o pedido novo, parar solta', () => {
    const a = criarAbertura({ nota: 'n1' })
    const copia = a.abertura.atual()
    copia.nota = 'mexido'
    assert.deepEqual(a.abertura.atual(), { nota: 'n1' })
    const vistos = []
    const parar = a.abertura.aoMudar((p) => vistos.push(p))
    a.mudar({ nota: 'n2' })
    parar()
    a.mudar({ nota: 'n3' })
    assert.deepEqual(vistos, [{ nota: 'n2' }])
    assert.equal(a.ouvintesVivos(), 0)
  })

  test('sem pedido é {}, e pedido que não é dado simples é recusado', () => {
    assert.deepEqual(criarAbertura().abertura.atual(), {})
    assert.throws(() => criarAbertura({ quando: new Date() }), comCodigo('valor-invalido'))
  })

  test('no falso, mudarAbertura chega ao app', () => {
    const f = criarSistemaFalso({ abertura: { nota: 'a' } })
    const vistos = []
    f.sistema.abertura.aoMudar((p) => vistos.push(p.nota))
    f.mudarAbertura({ nota: 'b' })
    assert.deepEqual([f.sistema.abertura.atual().nota, vistos], ['b', ['b']])
  })
})

describe('avisar com título', () => {
  test('o falso guarda o título só quando ele vem', () => {
    const f = criarSistemaFalso()
    f.sistema.avisar('nada foi perdido', { tipo: 'erro', titulo: 'Não salvou' })
    f.sistema.avisar('ok')
    assert.deepEqual(f.registro.avisos, [
      { mensagem: 'nada foi perdido', tipo: 'erro', fixo: false, titulo: 'Não salvou' },
      { mensagem: 'ok', tipo: 'info', fixo: false },
    ])
  })
})

describe('sistema de desenvolvimento: as opcionais', () => {
  test('tem as quatro, e um app que exige todas monta', () => {
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela: janelaFalsa(),
      registro: silencioso,
    })
    assert.equal(
      verificarSistema(sistema, { exigidas: ['colecoes', 'ia', 'arquivos', 'abertura'] }).ok,
      true,
    )
  })

  test('a conta local grava a coleção no localStorage, no espaço do app', async () => {
    const janela = janelaFalsa()
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela,
      registro: silencioso,
      colecoes: ['notas'],
    })
    assert.deepEqual(sistema.identidade.atual(), CONTA_DE_DESENVOLVIMENTO)
    await sistema.colecoes.abrir('notas').criar('n1', { titulo: 'oi' })
    const guardado = JSON.parse(janela.dados.get('roqueos:notes:colecao:local/notas'))
    assert.equal(guardado[0].titulo, 'oi')
    // Depois do F5: um sistema novo na mesma janela lê o que ficou.
    const depois = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela,
      registro: silencioso,
      colecoes: ['notas'],
    })
    let docs
    depois.sistema.colecoes.abrir('notas').observar((d) => (docs = d))
    assert.deepEqual(
      docs.map((d) => d.id),
      ['n1'],
    )
  })

  test('?convidado=1 entra como convidado, e ?abertura= chega ao app', async () => {
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela: janelaFalsa({
        href: 'http://localhost:5173/?convidado=1&abertura=%7B%22nota%22%3A%22n9%22%7D',
      }),
      registro: silencioso,
      colecoes: ['notas'],
    })
    assert.deepEqual(sistema.identidade.atual(), { uid: null, nome: null })
    assert.deepEqual(sistema.abertura.atual(), { nota: 'n9' })
    await assert.rejects(sistema.colecoes.abrir('notas').criar('x', {}), comCodigo('sem-conta'))
  })

  test('o painel de IA é um aviso dentro da âncora, e fechar chama o aoFechar', () => {
    const janela = janelaFalsa()
    const linhas = []
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela,
      registro: { info: (l) => linhas.push(l), debug() {} },
    })
    const ancora = janela.document.createElement('div')
    let fechou = 0
    const p = sistema.ia.abrirPainel({
      ancora,
      tipo: 'text',
      contexto: () => '',
      aoFechar: () => fechou++,
    })
    assert.equal(ancora.filhos.length, 1)
    assert.match(ancora.filhos[0].filhos[0].textContent, /IA roda dentro do RoqueOS/)
    p.fechar()
    p.fechar()
    assert.equal(fechou, 1)
    assert.deepEqual(linhas, ['[notes] painel de IA (text) aberto'])
  })

  test('salvar em Arquivos confere o pedido e diz onde salvaria', async () => {
    const linhas = []
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela: janelaFalsa(),
      registro: { info: (l) => linhas.push(l), debug() {} },
    })
    const salvo = await sistema.arquivos.salvar({ nome: 'a.md', conteudo: 'x' })
    assert.deepEqual([salvo.nome, salvo.pasta], ['a.md', 'Documentos'])
    assert.match(salvo.ref, /^arq\./)
    await assert.rejects(
      sistema.arquivos.salvar({ nome: 'a.md', conteudo: 'x', pasta: 'Raiz' }),
      comCodigo('pasta-invalida'),
    )
    assert.deepEqual(linhas, ['[notes] salvaria em Documentos/a.md'])
  })

  test('o título do aviso sai antes da mensagem no console', () => {
    const linhas = []
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'notes',
      janela: janelaFalsa(),
      registro: { info: (l) => linhas.push(l), debug() {} },
    })
    sistema.avisar('nada foi perdido', { tipo: 'erro', titulo: 'Não salvou' })
    assert.deepEqual(linhas, ['[notes] erro: Não salvou: nada foi perdido'])
  })
})

describe('manifesto: colecoes', () => {
  const base = () => ({
    id: 'notes',
    versaoDoContrato: 1,
    camada: 'comunidade',
    nome: { 'pt-BR': 'Notas', 'en-US': 'Notes' },
    descricao: { 'pt-BR': 'Notas', 'en-US': 'Notes' },
    icone: 'sticky_note_2',
    cor: '#f59e0b',
    categoria: 'productivity',
    janela: { largura: 900, altura: 600, minLargura: 360, minAltura: 400 },
    capacidades: ['colecoes'],
    colecoes: ['notas'],
    autor: 'Roque Ribeiro',
    licenca: 'MIT',
  })

  test('as opcionais novas passam em capacidades, e colecoes lista os nomes', () => {
    assert.deepEqual(
      validarManifesto({ ...base(), capacidades: ['colecoes', 'ia', 'arquivos', 'abertura'] }),
      [],
    )
  })

  test('pedir colecoes sem listar os nomes, e listar sem pedir, reprovam', () => {
    const semNomes = base()
    delete semNomes.colecoes
    assert.deepEqual(validarManifesto(semNomes), [
      'capacidades pede "colecoes": liste em "colecoes" os nomes que o app abre',
    ])
    assert.deepEqual(validarManifesto({ ...base(), capacidades: [] }), [
      'colecoes declaradas sem "colecoes" em capacidades',
    ])
  })

  test('nome fora do formato, lista vazia e repetido', () => {
    assert.match(validarManifesto({ ...base(), colecoes: ['Notas'] })[0], /colecoes: lista/)
    assert.match(validarManifesto({ ...base(), colecoes: [] })[0], /colecoes: lista/)
    assert.deepEqual(validarManifesto({ ...base(), colecoes: ['a', 'a'] }), [
      'colecoes: nome repetido',
    ])
  })
})
