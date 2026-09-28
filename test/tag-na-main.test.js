// A regra "tag de release só em commit da main", contra um repositório de verdade.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { semVariaveisDoRepo, tagNaMain } from '../bin/tag-na-main.mjs'

// O repositório de teste nunca herda o GIT_DIR de quem roda a suíte: rodando no pre-push de
// uma worktree, herdar fazia o git do teste escrever no clone de verdade.
function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'tag-na-main-'))
  const git = (...a) =>
    execFileSync('git', ['-c', 'user.name=Teste', '-c', 'user.email=t@t', ...a], {
      cwd,
      env: semVariaveisDoRepo(),
    })
      .toString()
      .trim()
  git('init', '-q', '-b', 'main')
  writeFileSync(join(cwd, 'a'), '1')
  git('add', '.')
  git('commit', '-q', '-m', 'a')
  const naMain = git('rev-parse', 'HEAD')
  git('checkout', '-q', '-b', 'pr')
  writeFileSync(join(cwd, 'a'), '2')
  git('commit', '-qam', 'b')
  const noPr = git('rev-parse', 'HEAD')
  return { cwd, git, naMain, noPr }
}

describe('tag-na-main', () => {
  test('commit da main passa; commit só do PR reprova; depois do merge sem squash, passa', () => {
    const { cwd, git, naMain, noPr } = repo()
    assert.equal(tagNaMain(naMain, { main: 'main', cwd }).ok, true)
    const fora = tagNaMain(noPr, { main: 'main', cwd })
    assert.equal(fora.ok, false)
    assert.match(fora.mensagem, /não está na história de main/)
    git('checkout', '-q', 'main')
    git('merge', '-q', '--no-ff', '-m', 'merge do pr', 'pr')
    assert.equal(tagNaMain(noPr, { main: 'main', cwd }).ok, true)
    rmSync(cwd, { recursive: true })
  })

  test('o squash é justamente o caso que reprova: o commit do PR fica de fora', () => {
    const { cwd, git, noPr } = repo()
    git('checkout', '-q', 'main')
    git('merge', '-q', '--squash', 'pr')
    git('commit', '-qm', 'squash do pr')
    assert.equal(tagNaMain(noPr, { main: 'main', cwd }).ok, false)
    rmSync(cwd, { recursive: true })
  })

  test('o GIT_DIR de um hook não escolhe o repositório: quem escolhe é o cwd', () => {
    const fora = mkdtempSync(join(tmpdir(), 'tag-na-main-hook-'))
    const isca = join(fora, 'repo-do-hook.git')
    const antes = { GIT_DIR: process.env.GIT_DIR, GIT_INDEX_FILE: process.env.GIT_INDEX_FILE }
    process.env.GIT_DIR = isca
    process.env.GIT_INDEX_FILE = join(isca, 'index')
    try {
      const { cwd, naMain, noPr } = repo()
      assert.equal(existsSync(join(cwd, '.git')), true)
      assert.equal(tagNaMain(naMain, { main: 'main', cwd }).ok, true)
      assert.equal(tagNaMain(noPr, { main: 'main', cwd }).ok, false)
      assert.equal(existsSync(isca), false, 'o git escreveu no repositório do hook')
      rmSync(cwd, { recursive: true })
    } finally {
      for (const [k, v] of Object.entries(antes)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
      rmSync(fora, { recursive: true })
    }
  })

  test('commit que não existe é erro de uso, e não aprovação', () => {
    const { cwd } = repo()
    const r = tagNaMain('deadbeef', { main: 'main', cwd })
    assert.equal(r.ok, false)
    assert.equal(r.erro, true)
    rmSync(cwd, { recursive: true })
  })
})
