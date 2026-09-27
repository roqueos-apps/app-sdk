import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validarManifesto, CATEGORIAS } from '../src/manifesto.js'
import { IDIOMAS } from '../src/idiomas.js'

const BASE = JSON.parse(
  readFileSync(new URL('./fixtures/app-ok/app.json', import.meta.url), 'utf8'),
)
const com = (mudanca) => ({ ...structuredClone(BASE), ...mudanca })

describe('validarManifesto', () => {
  test('o manifesto do app de teste passa', () => {
    assert.deepEqual(validarManifesto(BASE), [])
  })

  test('o que não é objeto', () => {
    assert.deepEqual(validarManifesto([]), ['app.json não é um objeto'])
    assert.deepEqual(validarManifesto(null), ['app.json não é um objeto'])
  })

  test('campo que o manifesto não conhece reprova, inclusive dentro da janela', () => {
    assert.deepEqual(validarManifesto(com({ maximizável: false })), [
      'campo que o manifesto não conhece: maximizável',
    ])
    assert.deepEqual(validarManifesto(com({ janela: { ...BASE.janela, redimensionavel: true } })), [
      'janela com campo desconhecido: redimensionavel',
    ])
  })

  test('id, versão e camada', () => {
    assert.deepEqual(validarManifesto(com({ id: 'Calc-1' })), ['id inválido: "Calc-1"'])
    assert.deepEqual(validarManifesto(com({ versaoDoContrato: 2 })), [
      'versaoDoContrato é 2, este SDK fala o 1',
    ])
    assert.deepEqual(validarManifesto(com({ camada: 'sistema' })), [
      'camada: uma de primeira-parte, comunidade',
    ])
  })

  test('primeira parte fala os dez idiomas; comunidade, pt-BR e en-US', () => {
    const nome = { ...BASE.nome }
    delete nome['ja-JP']
    assert.deepEqual(validarManifesto(com({ nome })), ['nome sem texto em: ja-JP'])
    const soDois = { 'pt-BR': 'Contador', 'en-US': 'Counter' }
    assert.deepEqual(
      validarManifesto(com({ camada: 'comunidade', nome: soDois, descricao: soDois })),
      [],
    )
    assert.deepEqual(
      validarManifesto(
        com({ camada: 'comunidade', nome: { 'pt-BR': 'Contador' }, descricao: soDois }),
      ),
      ['nome sem texto em: en-US'],
    )
  })

  test('idioma que a casa não fala, e texto vazio num idioma opcional', () => {
    assert.deepEqual(validarManifesto(com({ nome: { ...BASE.nome, 'pt-PT': 'Contador' } })), [
      'nome tem idioma que a casa não fala: pt-PT',
    ])
    const soDois = { 'pt-BR': 'Contador', 'en-US': 'Counter' }
    assert.deepEqual(
      validarManifesto(
        com({ camada: 'comunidade', nome: { ...soDois, 'es-ES': ' ' }, descricao: soDois }),
      ),
      ['nome com texto vazio em: es-ES'],
    )
  })

  test('ícone: Material Icon ou SVG do repo', () => {
    assert.deepEqual(validarManifesto(com({ icone: 'calculate' })), [])
    assert.deepEqual(validarManifesto(com({ icone: 'public/icone.png' })), [
      'icone: nome de Material Icon (calculate) ou caminho de SVG no repo',
    ])
  })

  test('cor, categoria (sem system) e naLoja', () => {
    assert.deepEqual(validarManifesto(com({ cor: 'orange' })), ['cor: hexadecimal de seis dígitos'])
    assert.ok(!CATEGORIAS.includes('system'))
    assert.match(validarManifesto(com({ categoria: 'system' }))[0], /^categoria: uma de/)
    assert.deepEqual(validarManifesto(com({ naLoja: 'sim' })), ['naLoja: true ou false'])
  })

  test('janela: pixels inteiros, mínimo dentro do tamanho, maximizavel booleano', () => {
    assert.deepEqual(validarManifesto(com({ janela: { largura: 300, altura: 200 } })), [
      'janela: largura, altura, minLargura e minAltura em pixels',
    ])
    assert.deepEqual(validarManifesto(com({ janela: { ...BASE.janela, minLargura: 400 } })), [
      'janela: o mínimo não pode passar do tamanho inicial',
    ])
    assert.deepEqual(validarManifesto(com({ janela: { ...BASE.janela, maximizavel: 'não' } })), [
      'janela.maximizavel: true ou false',
    ])
  })

  test('capacidades só lista opcionais; obrigatória lá é erro que explica', () => {
    const [p] = validarManifesto(com({ capacidades: ['armazenamento'] }))
    assert.match(
      p,
      /não reconhecidas ou obrigatórias: armazenamento \(as obrigatórias o sistema sempre dá\)/,
    )
    assert.deepEqual(validarManifesto(com({ capacidades: 'ia' })), ['capacidades: lista'])
  })

  test('autor e licença são obrigatórios', () => {
    assert.deepEqual(validarManifesto(com({ autor: '', licenca: undefined })), [
      'autor: quem responde pelo app',
      'licenca: o identificador SPDX (MIT)',
    ])
  })

  test('o app de teste fala os dez', () => {
    assert.deepEqual(Object.keys(BASE.nome), [...IDIOMAS])
  })
})
