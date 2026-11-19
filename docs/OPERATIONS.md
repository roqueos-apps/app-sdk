# Operations

_English | [Português](pt-BR/OPERACAO.md)_

> **Who it is for:** the maintainer, and the agent that runs the maintenance routine.
> **What is here:** the routine, how to cut a release, how to change the contract without breaking the family, how consumers move to a new tag, how to undo each irreversible step, backup, and what to watch.
> **Where to go for the rest:** what each failure means is in [WHEN-IT-BREAKS.md](WHEN-IT-BREAKS.md); the commands, in [REFERENCE.md](REFERENCE.md#1-commands-and-scripts).

## Contents

1. [The routine](#1-the-routine)
2. [Cutting a release](#2-cutting-a-release)
3. [Changing the contract without breaking](#3-changing-the-contract-without-breaking)
4. [Moving consumers to a new tag](#4-moving-consumers-to-a-new-tag)
5. [Undoing](#5-undoing)
6. [Backup and restore](#6-backup-and-restore)
7. [What to monitor](#7-what-to-monitor)

## 1. The routine

There is no schedule and nothing running: the SDK has no server. The routine is the one in [`.claude/loop.md`](../.claude/loop.md), one thing per iteration, stopping at the first that has work, with the evidence pasted in the chat:

1. Red gate: `yarn verificar` (through `roqueos-gate` when the kit is installed).
2. Red CI on GitHub: `gh run list --limit 3`. Red there and green here is a diverging environment, investigated before anything else.
3. A pull request without `Signed-off-by`: the contributor gets the command that fixes it, `git rebase --signoff main`.
4. An outside issue or pull request without an answer: `gh issue list` and `gh pr list`.
5. An asset without origin (in app repositories, where `public/` exists).
6. SDK behind (in app repositories): a new SDK tag with a capability the app uses becomes a bump.
7. Docs drift: README, CONTRIBUTING and the documents here say the same thing as the code.

## 2. Cutting a release

The repository has no release script. A release is a version in [`package.json`](../package.json), an entry in [`CHANGELOG.md`](../CHANGELOG.md) and a `vX.Y.Z` tag on a commit of `main`:

```bash
# on the release branch: version in package.json and the CHANGELOG entry, then the gate
yarn verificar
git commit -s -m "<versão e o que ela traz>"
# open the PR; merge it into main WITHOUT squash, so the commit itself enters main
git switch main && git pull
git tag v0.4.0 <commit of main>
git push origin v0.4.0
gh run list --workflow tag --limit 1     # must be green
```

The `tag` workflow ([`.github/workflows/tag.yml`](../.github/workflows/tag.yml)) runs `node bin/tag-na-main.mjs "$GITHUB_SHA" origin/main` on every `v*` tag and goes red when the tagged commit is not in `main`. 0.2.0 and 0.3.0 entered `main` by merge without squash, which is why their tag commits are in it ([CHANGELOG.md](../CHANGELOG.md)). The version number `0.4.0` above is an example.

## 3. Changing the contract without breaking

The versioning is semantic over the contract ([CHANGELOG.md](../CHANGELOG.md), [`src/contrato.js`](../src/contrato.js)):

| Change                                                     | Version                             | Why                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| new optional capability                                    | minor                               | an old app is still served                                                                                             |
| a function added to an optional                            | minor                               | an old app is still served; a system without the function refuses an app that requires the capability, with the reason |
| a new CSS variable in `VARIAVEIS_DO_SISTEMA`               | minor                               | nothing that worked stops                                                                                              |
| a function removed, or the shape or meaning of one changed | new contract (`VERSAO_DO_CONTRATO`) | the system refuses the app that asks for another version instead of breaking at runtime                                |
| a CSS variable removed                                     | breaking                            | the theme contract with RoqueOS ([CLAUDE.md](../CLAUDE.md))                                                            |

The order across repositories is fixed: the SDK changes first, the RoqueOS system follows, the apps bump last. The blast radius is in the `roqueos-kit` graph: `roqueos-graph blast app-sdk`.

## 4. Moving consumers to a new tag

Each consumer pins a tag in its `package.json` (`github:roqueos-apps/app-sdk#vX.Y.Z`). Moving is a change in that line, a `yarn install`, the consumer's gate green and its changelog saying what changed ([`.claude/loop.md`](../.claude/loop.md)). Which tag each local clone pinned on 18/11/2026 is in [INTEGRATIONS.md](INTEGRATIONS.md#5-who-pins-which-version).

## 5. Undoing

| Irreversible step                                | How to undo                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a tag pushed on the wrong commit                 | before anyone pins: `git push origin :refs/tags/vX.Y.Z`, `git tag -d vX.Y.Z`, tag the `main` commit and push again. After a consumer pinned it, do not move it: cut a new patch version |
| a release that breaks a consumer                 | the consumer goes back to the previous tag in its `package.json`; here, a `git revert` on `main` and a new tag                                                                          |
| a squash merge of a release PR                   | the tag commit is not in `main`: redo the tag on the squash commit, before anyone pins                                                                                                  |
| a commit without sign-off already pushed to a PR | `git rebase --signoff main` and `git push --force-with-lease` on the PR branch (never on `main`)                                                                                        |

## 6. Backup and restore

The SDK has no state: no database, no generated files, no secrets. Everything is in git on GitHub (`roqueos-apps/app-sdk`), and the consumers carry the exact SHA in their lockfiles. Restoring is a clone:

```bash
git clone https://github.com/roqueos-apps/app-sdk.git && cd app-sdk && yarn install --frozen-lockfile --ignore-scripts && yarn verificar
```

## 7. What to monitor

| Signal       | Healthy                                                           | How to see it                           |
| ------------ | ----------------------------------------------------------------- | --------------------------------------- |
| the gate     | `yarn verificar` exits 0; 133 tests pass (measured on 18/11/2026) | `yarn verificar`                        |
| CI           | `verificar` green on `main` and on open pull requests             | `gh run list --limit 3`                 |
| the last tag | the `tag` workflow green for it                                   | `gh run list --workflow tag --limit 1`  |
| contributors | no outside issue or pull request without an answer                | `gh issue list`, `gh pr list`           |
| the docs     | `roqueos-docs` ends with `roqueos-docs: ok`                       | `node <roqueos-kit>/tools/roqueos-docs` |
