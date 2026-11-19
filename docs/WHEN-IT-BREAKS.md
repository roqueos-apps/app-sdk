# When it breaks

_English | [Português](pt-BR/QUANDO-QUEBRA.md)_

> **Who it is for:** whoever has a red gate, a red workflow or an app that refuses to mount, and wants the cause and the fix without reading the source.
> **What is here:** the first diagnostic command, then by area (installing, the gate, the app check, mounting and capabilities, releasing) a table of what appears, the cause and what to do.
> **Where to go for the rest:** the meaning of every section, field and code is in [REFERENCE.md](REFERENCE.md); why a rule exists, in [ARCHITECTURE.md](ARCHITECTURE.md#8-design-decisions).

The messages are quoted exactly as the programs print them, in Portuguese, so you can search for them.

## Contents

- [First, the diagnosis](#first-the-diagnosis)
- [1. Installing](#1-installing)
- [2. The gate](#2-the-gate)
- [3. The app check](#3-the-app-check)
- [4. Mounting and capabilities](#4-mounting-and-capabilities)
- [5. Releasing](#5-releasing)

## First, the diagnosis

```bash
yarn verificar
```

It stops at the first step that fails, and the step's name tells the area: `eslint`, `prettier --check`, `node --test` or `app check`. For an app repository, `node bin/app.mjs check <folder> --json` gives every section's problems in one object.

## 1. Installing

| What appears                                                                                                 | Cause                                                                            | What to do                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `App do RoqueOS e o SDK de apps (JavaScript, yarn) usa yarn (yarn add, yarn dlx, yarn create), nao npm/npx.` | the `roqueos-kit` package-manager hook reads `pkgManager: "yarn"` for this stack | use `yarn` (`yarn install --ignore-scripts`, `yarn prettier`), never `npm` or `npx`                        |
| `yarn install` in an app fails fetching `github:roqueos-apps/app-sdk#vX.Y.Z`                                 | the tag does not exist, or GitHub is unreachable                                 | check the tag with `git ls-remote --tags https://github.com/roqueos-apps/app-sdk.git`; pin an existing one |

## 2. The gate

| What appears                                                                             | Cause                                                           | What to do                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[warn] Code style issues found in the above file. Run Prettier with --write to fix.`    | a file, Markdown included, is not in Prettier's format          | `yarn format`, then review the diff                                                                                                                                                               |
| `# fail 1` (or more) in the `node --test` output                                         | a test failed; the name above it says which                     | run `yarn test` and read the failing assertion; never weaken the test to pass                                                                                                                     |
| after `yarn test` in a worktree, `core.bare = true` in the real clone and a branch moved | the `tag-na-main` test inherited the pre-push hook's `GIT_DIR`  | fixed in 0.3.0 (28/09/2026): `semVariaveisDoRepo` drops `GIT_*` when `cwd` is explicit ([`bin/tag-na-main.mjs`](../bin/tag-na-main.mjs)); if it shows again, a new git call is missing that `env` |
| CI red on GitHub, green locally                                                          | different environment (Node from `.nvmrc`, `--frozen-lockfile`) | investigate before anything else ([`.claude/loop.md`](../.claude/loop.md)); run `yarn install --frozen-lockfile --ignore-scripts` locally                                                         |

## 3. The app check

Each line below is a literal example; the file, line and names vary.

| What appears                                                                                                                          | Cause                                                                                   | What to do                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `package.json declara "postinstall", que roda sozinho no install de quem depende deste pacote`                                        | an install-time script                                                                  | remove it; run the step by hand or in the dev script                                                     |
| `app.json: campo que o manifesto não conhece: maximizável`                                                                            | an unknown field, here a typo with an accent                                            | use the field from [REFERENCE.md](REFERENCE.md#5-the-appjson-manifest) (`maximizavel`)                   |
| `i18n/de-DE.json sem: titulo, somar`                                                                                                  | keys present in `pt-BR.json` missing in another language                                | add the translations; first party needs all ten languages                                                |
| `public/novo.png sem linha no ASSETS.md (caminho \| licença \| origem)`                                                               | a file in `public/` without its row                                                     | add the row with an accepted licence and the origin                                                      |
| `src/index.js:26 importa "firebase/app": o app não fala com banco, quem guarda é o sistema`                                           | the app talks to the database                                                           | use `colecoes`, `armazenamento` or `anexos`                                                              |
| ``src/index.js:27 importa "src/stores/roqueos", que só existe dentro do RoqueOS: o que o app precisa do sistema vem pelo `sistema` `` | an import of RoqueOS internals, which compiles inside RoqueOS and reads the whole store | take what is needed from the `sistema`; ask for a capability if none fits ([EXTENDING.md](EXTENDING.md)) |
| `src/estilo.css:6 usa --ros-text-70, que não está entre as variáveis do sistema que um app pode usar (...)`                           | a theme variable outside the contract                                                   | compose from a base (`rgba(var(--ros-text-rgb), .7)`) or propose the variable                            |
| `src/index.js:28 usa sistema.colecoes sem "colecoes" em capacidades no app.json`                                                      | an optional used but not declared; it would mount in `yarn dev` and break elsewhere     | add it to `capacidades` (and `colecoes` names, if it is `colecoes`)                                      |
| `src/index.js:29 listar('Imagens') sem "Imagens" em pastas no app.json`                                                               | a folder listed but not declared                                                        | add it to `pastas`                                                                                       |
| `uso: app check [pasta] [--sdk] [--json]`, exit 2                                                                                     | the command was not `check`                                                             | `node bin/app.mjs check [folder]`                                                                        |

## 4. Mounting and capabilities

| What appears                                                                                                          | Cause                                                                            | What to do                                                                                   |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `[notas] o sistema não cumpre o contrato: o sistema fala o contrato 2, o app fala o 1; falta a capacidade "colecoes"` | the system has another contract version or lacks a capability the app requires   | update the side that is behind: the SDK changes first, the RoqueOS system follows, apps last |
| `id de app inválido: "Notas" (minúsculas e dígitos, começando por letra)`                                             | the id breaks `^[a-z][a-z0-9]*$`                                                 | lower case and digits; the id is permanent, so decide it once                                |
| `[x] montar precisa devolver { ativar, desmontar }`                                                                   | the app's `montar` returned nothing or no `desmontar`                            | return `{ ativar, desmontar }`                                                               |
| `colecao-desconhecida`: `coleção "notas" não está no mapa deste app (nenhuma)`                                        | the collection is not in the system's map; in the fake system, not in `colecoes` | declare it in `app.json` `colecoes`; in tests pass `colecoes: ['notas']`                     |
| `sem-conta`: `a capacidade guarda na conta, e não há ninguém entrado`                                                 | a guest tried to write                                                           | offer to sign in; never pretend it was saved                                                 |
| `campo-do-sistema`: `"criadoEm" é do sistema: o id vai no primeiro argumento e as datas ele carimba`                  | the app sent a stamp or the `id` among the fields                                | remove it from the fields                                                                    |
| `pasta-nao-declarada`: `o app não declarou "Imagens" em "pastas" no app.json (declarou: nenhuma)`                     | `listar` or `abrirPasta` on an undeclared folder                                 | declare it in `pastas`; in tests pass `pastas: ['Imagens']`                                  |
| `ref-invalida`: `ref de outra sessão: ref não se guarda, liste a pasta de novo`                                       | a ref kept in storage from another session                                       | keep the name, list the folder again                                                         |
| `grande-demais`: `o anexo tem 11534336 bytes, e o limite é 10485760`                                                  | an attachment above 10 MB                                                        | shrink it before `guardar`                                                                   |
| `valor-invalido`: `abrirPainel: ancora: o elemento do app onde o painel aparece; tipo: um de text, code, read; ...`   | a wrong `abrirPainel` request; every problem is listed                           | fix each one listed                                                                          |

## 5. Releasing

| What appears                                                                                                                                  | Cause                                                                                                          | What to do                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `tag` workflow red: `<sha> não está na história de origin/main: tag de release só depois do merge (sem squash), no commit que entrou na main` | the tag points to a branch commit; it happened with v0.2.0 while its commit was only in PR #4 (September 2026) | delete the tag and redo it on the `main` commit, before anyone pins ([OPERATIONS.md](OPERATIONS.md#5-undoing)) |
| `o git não achou <commit> ou origin/main: ...`, exit 2                                                                                        | the commit or the `main` ref does not exist in the clone                                                       | in CI the checkout uses `fetch-depth: 0`; locally, `git fetch origin`                                          |
| `dco` red: `commit xxxxxxxx sem Signed-off-by. Refaça com: git commit --amend -s (ou git rebase --signoff)`                                   | a commit of the pull request has no `Signed-off-by`                                                            | `git rebase --signoff main` and push again                                                                     |
