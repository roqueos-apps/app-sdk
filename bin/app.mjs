#!/usr/bin/env node
// app check: confere um repo de app contra o contrato do RoqueOS.
//
//   app check            no diretório atual
//   app check <pasta>
//   app check --sdk      o próprio SDK (só a regra de script de instalação)
//   app check --json
//
// Sai 1 se qualquer seção tiver problema. Sem "aviso": problema que não
// reprova é problema que ninguém conserta.

import { resolve } from 'node:path'
import { verificarRepo } from '../src/verificacao.js'

const args = process.argv.slice(2)
const [comando, ...resto] = args
const flags = new Set(resto.filter((a) => a.startsWith('--')))
const pasta = resolve(resto.find((a) => !a.startsWith('--')) ?? '.')

if (comando !== 'check') {
  console.error('uso: app check [pasta] [--sdk] [--json]')
  process.exit(2)
}

const secoes = verificarRepo(pasta, { sdk: flags.has('--sdk') })
const total = secoes.reduce((n, s) => n + s.problemas.length, 0)

if (flags.has('--json')) {
  console.log(JSON.stringify({ ok: total === 0, pasta, secoes }))
} else {
  for (const { secao, problemas } of secoes) {
    console.log(`${problemas.length ? 'REPROVOU' : 'ok      '}  ${secao}`)
    for (const p of problemas) console.log(`          ${p}`)
  }
  console.log(total ? `\n${total} problema(s).` : '\nok, o repo cumpre o contrato.')
}
process.exit(total ? 1 : 0)
