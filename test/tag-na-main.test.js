// A regra "tag de release só em commit da main", contra um repositório de verdade.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tagNaMain } from '../bin/tag-na-main.mjs'

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'tag-na-main-'))
  const git = (...a) =>
    execFileSync('git', ['-c', 'user.name=Teste', '-c', 'user.email=t@t', ...a], { cwd })
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

  test('commit que não existe é erro de uso, e não aprovação', () => {
    const { cwd } = repo()
    const r = tagNaMain('deadbeef', { main: 'main', cwd })
    assert.equal(r.ok, false)
    assert.equal(r.erro, true)
    rmSync(cwd, { recursive: true })
  })
})
