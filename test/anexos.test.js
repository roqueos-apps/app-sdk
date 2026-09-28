// A 0.3.0: os anexos do app. Bytes do app na conta da pessoa, por um id que dura
// entre sessões e que nunca vira URL.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPACIDADES,
  ErroDoSistema,
  OPCIONAIS,
  TAMANHO_MAXIMO_DE_ANEXO,
  conferirConteudoDeAnexo,
  conferirIdDeAnexo,
  gerarIdDeAnexo,
  verificarSistema,
} from '../src/index.js'
import { criarSistemaFalso, criarBancoDeAnexos } from '../src/host/falso.js'
import { criarSistemaDeDesenvolvimento } from '../src/host/desenvolvimento.js'

const ANA = { uid: 'ana', nome: 'Ana' }
const BIA = { uid: 'bia', nome: 'Bia' }
const comCodigo = (codigo) => (e) => e instanceof ErroDoSistema && e.codigo === codigo
const silencioso = { info() {}, debug() {} }
const imagem = (texto = 'px') => new Blob([texto], { type: 'image/png' })

describe('anexos: o id e o conteúdo', () => {
  test('o id é anx_ e 24 símbolos, e dois ids nunca se repetem', () => {
    const ids = new Set(Array.from({ length: 200 }, gerarIdDeAnexo))
    assert.equal(ids.size, 200)
    for (const id of ids) assert.match(id, /^anx_[a-z2-7]{24}$/)
    assert.equal(conferirIdDeAnexo('anx_abcdefghijklmnopqrstuvwx'), 'anx_abcdefghijklmnopqrstuvwx')
  })

  test('id fora do formato, caminho ou URL é recusado antes de chegar ao sistema', () => {
    for (const ruim of [
      undefined,
      '',
      'anx_curto',
      'anx_ABCDEFGHIJKLMNOPQRSTUVWX',
      'users/ana/apps/lousa/anexos/anx_abcdefghijklmnopqrstuvwx',
      'https://firebasestorage.googleapis.com/x',
      'arq.sessao.ref',
    ]) {
      assert.throws(() => conferirIdDeAnexo(ruim), comCodigo('id-invalido'), String(ruim))
    }
  })

  test('o conteúdo é Blob ou File, e acima do teto é grande-demais', () => {
    assert.equal(conferirConteudoDeAnexo(imagem()).type, 'image/png')
    for (const ruim of ['texto', { size: 1 }, null, new Uint8Array(3)]) {
      assert.throws(() => conferirConteudoDeAnexo(ruim), comCodigo('valor-invalido'))
    }
    const grande = new Blob([new Uint8Array(TAMANHO_MAXIMO_DE_ANEXO + 1)])
    assert.throws(() => conferirConteudoDeAnexo(grande), comCodigo('grande-demais'))
    assert.equal(
      conferirConteudoDeAnexo(new Blob([new Uint8Array(TAMANHO_MAXIMO_DE_ANEXO)])).size,
      TAMANHO_MAXIMO_DE_ANEXO,
    )
  })

  test('a capacidade é opcional, com a forma do contrato', () => {
    assert.equal(OPCIONAIS.includes('anexos'), true)
    assert.deepEqual(Object.keys(CAPACIDADES.anexos.forma), ['guardar', 'ler', 'apagar'])
    const { sistema } = criarSistemaFalso()
    assert.deepEqual(verificarSistema(sistema, { exigidas: ['anexos'] }), {
      ok: true,
      problemas: [],
    })
    const semAnexos = { ...sistema, anexos: undefined }
    assert.deepEqual(verificarSistema(semAnexos, { exigidas: ['anexos'] }).problemas, [
      'falta a capacidade "anexos"',
    ])
  })
})

describe('anexos: a semântica, no sistema falso', () => {
  test('o id guardado numa sessão abre na sessão seguinte, com o tipo do Blob', async () => {
    const banco = criarBancoDeAnexos()
    const hoje = criarSistemaFalso({ appId: 'lousa', identidade: ANA, bancoDeAnexos: banco })
    const { id } = await hoje.sistema.anexos.guardar(imagem('praia'))
    // Outra janela, outro dia: um sistema novo do mesmo app, na mesma conta.
    const amanha = criarSistemaFalso({ appId: 'lousa', identidade: ANA, bancoDeAnexos: banco })
    const lido = await amanha.sistema.anexos.ler(id)
    assert.deepEqual([lido.type, await lido.text()], ['image/png', 'praia'])
    assert.deepEqual(amanha.anexos.guardados(), [id])
  })

  test('o anexo de outro app, ou de outra conta, não existe aqui', async () => {
    const banco = criarBancoDeAnexos()
    const lousa = criarSistemaFalso({ appId: 'lousa', identidade: ANA, bancoDeAnexos: banco })
    const { id } = await lousa.sistema.anexos.guardar(imagem())
    const paint = criarSistemaFalso({ appId: 'paint', identidade: ANA, bancoDeAnexos: banco })
    await assert.rejects(paint.sistema.anexos.ler(id), comCodigo('nao-encontrado'))
    const daBia = criarSistemaFalso({ appId: 'lousa', identidade: BIA, bancoDeAnexos: banco })
    await assert.rejects(daBia.sistema.anexos.ler(id), comCodigo('nao-encontrado'))
    // E apagar de lá não apaga daqui.
    await paint.sistema.anexos.apagar(id)
    assert.equal(await (await lousa.sistema.anexos.ler(id)).text(), 'px')
  })

  test('apagar tira, e apagar de novo não é erro', async () => {
    const f = criarSistemaFalso({ appId: 'lousa', identidade: ANA })
    const { id } = await f.sistema.anexos.guardar(imagem())
    await f.sistema.anexos.apagar(id)
    await f.sistema.anexos.apagar(id)
    await assert.rejects(f.sistema.anexos.ler(id), comCodigo('nao-encontrado'))
    assert.deepEqual(f.anexos.guardados(), [])
  })

  test('sem conta, as três rejeitam com sem-conta; conteúdo errado vem antes', async () => {
    const f = criarSistemaFalso({ appId: 'lousa' })
    await assert.rejects(f.sistema.anexos.guardar(imagem()), comCodigo('sem-conta'))
    await assert.rejects(f.sistema.anexos.ler(gerarIdDeAnexo()), comCodigo('sem-conta'))
    await assert.rejects(f.sistema.anexos.apagar(gerarIdDeAnexo()), comCodigo('sem-conta'))
    await assert.rejects(f.sistema.anexos.guardar('texto'), comCodigo('valor-invalido'))
    await assert.rejects(f.sistema.anexos.ler('x'), comCodigo('id-invalido'))
    await assert.rejects(f.sistema.anexos.apagar('x'), comCodigo('id-invalido'))
  })

  test('id fabricado no formato certo não acha nada', async () => {
    const f = criarSistemaFalso({ appId: 'lousa', identidade: ANA })
    await assert.rejects(f.sistema.anexos.ler(gerarIdDeAnexo()), comCodigo('nao-encontrado'))
  })

  test('o anexo grande demais não ocupa espaço', async () => {
    const f = criarSistemaFalso({ appId: 'lousa', identidade: ANA })
    const grande = new Blob([new Uint8Array(TAMANHO_MAXIMO_DE_ANEXO + 1)])
    await assert.rejects(f.sistema.anexos.guardar(grande), comCodigo('grande-demais'))
    assert.deepEqual(f.anexos.guardados(), [])
  })
})

describe('anexos: o sistema de desenvolvimento', () => {
  test('guarda e lê na conta local, e passa na verificação exigindo anexos', async () => {
    const { sistema } = criarSistemaDeDesenvolvimento({
      appId: 'lousa',
      janela: { navigator: { language: 'pt-BR' }, location: { href: 'http://localhost/' } },
      registro: silencioso,
    })
    assert.equal(verificarSistema(sistema, { exigidas: ['anexos'] }).ok, true)
    const { id } = await sistema.anexos.guardar(imagem('dev'))
    assert.equal(await (await sistema.anexos.ler(id)).text(), 'dev')
  })
})
