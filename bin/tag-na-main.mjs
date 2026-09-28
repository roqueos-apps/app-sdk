#!/usr/bin/env node
// A TAG DE RELEASE SÓ EM COMMIT QUE JÁ ESTÁ NA `main`.
//
// O RoqueOS e os apps pinam o SDK por tag. A v0.2.0 nasceu num commit do PR #4,
// antes da revisão: se aquele PR entrar por squash, o commit da tag nunca vira
// história da `main`, e a família inteira fica pinada num commit que a `main` não
// contém. A partir da 0.3.0 a regra é esta, e quem a executa é o workflow `tag`,
// que roda este script em todo push de tag `v*` e reprova a tag fora da `main`.
//
// Uso: node bin/tag-na-main.mjs <commit> [<ref da main>]
//   sai 0 quando o commit é ancestral da main (ou é ela), 1 quando não é, 2 quando
//   faltou argumento ou o git não achou o commit.

import { execFileSync } from 'node:child_process'

/**
 * O ambiente sem as variáveis `GIT_*`.
 *
 * Um hook do git exporta `GIT_DIR` (e às vezes `GIT_INDEX_FILE`) apontando para o repositório
 * de quem chamou. Quem roda git com um `cwd` escolhido e herda esse ambiente fala com o
 * repositório do hook, não com o do `cwd`, e não só para ler: numa worktree, o `yarn test` do
 * pre-push fez o `git init` do teste gravar `core.bare = true` no clone e o `git commit` do
 * teste andar o branch de verdade. Com `cwd` explícito, quem decide o repositório é o `cwd`.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export function semVariaveisDoRepo(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !k.startsWith('GIT_')))
}

/**
 * @param {string} commit
 * @param {{ main?: string, cwd?: string }} [opcoes]
 * @returns {{ ok: boolean, mensagem: string }}
 */
export function tagNaMain(commit, { main = 'origin/main', cwd } = {}) {
  const env = cwd ? semVariaveisDoRepo() : process.env
  const git = (...args) =>
    execFileSync('git', args, { cwd: cwd ?? process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
  let sha
  try {
    sha = git('rev-parse', '--verify', `${commit}^{commit}`).toString().trim()
    git('rev-parse', '--verify', `${main}^{commit}`)
  } catch (e) {
    return { ok: false, erro: true, mensagem: `o git não achou ${commit} ou ${main}: ${e.message}` }
  }
  try {
    git('merge-base', '--is-ancestor', sha, main)
    return { ok: true, mensagem: `${sha.slice(0, 7)} está na história de ${main}` }
  } catch {
    return {
      ok: false,
      mensagem:
        `${sha.slice(0, 7)} não está na história de ${main}: tag de release só depois do merge ` +
        '(sem squash), no commit que entrou na main',
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [commit, main] = process.argv.slice(2)
  if (!commit) {
    console.error('uso: node bin/tag-na-main.mjs <commit> [<ref da main>]')
    process.exit(2)
  }
  const r = tagNaMain(commit, { main })
  console[r.ok ? 'log' : 'error'](r.mensagem)
  process.exit(r.ok ? 0 : r.erro ? 2 : 1)
}
