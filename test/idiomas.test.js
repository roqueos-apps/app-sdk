import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IDIOMAS, IDIOMA_CANONICO, IDIOMA_DE_RECUO, normalizarIdioma } from '../src/idiomas.js'

// A lista é a do RoqueOS inteiro, igual à do jogo-sdk. Idioma novo é mudança no
// sistema, não neste pacote: este teste existe para a troca não passar calada.
test('os dez idiomas do RoqueOS, na ordem da casa', () => {
  assert.deepEqual(IDIOMAS, [
    'pt-BR',
    'en-US',
    'es-ES',
    'fr-FR',
    'de-DE',
    'ja-JP',
    'zh-CN',
    'hi-IN',
    'ru-RU',
    'ar-AR',
  ])
  assert.equal(IDIOMA_CANONICO, 'pt-BR')
  assert.equal(IDIOMA_DE_RECUO, 'en-US')
})

test('normalizarIdioma leva o que o navegador diz para um dos dez', () => {
  assert.equal(normalizarIdioma('pt'), 'pt-BR')
  assert.equal(normalizarIdioma('PT-pt'), 'pt-BR')
  assert.equal(normalizarIdioma('zh-Hans-CN'), 'zh-CN')
  assert.equal(normalizarIdioma('ar'), 'ar-AR')
  assert.equal(normalizarIdioma('ko-KR'), 'en-US')
  assert.equal(normalizarIdioma(undefined), 'en-US')
})
