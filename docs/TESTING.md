# Testing

_English | [Português](pt-BR/TESTES.md)_

> **Who it is for:** whoever changes the SDK and needs to know which suite proves what, and what "done" means here.
> **What is here:** the acceptance criterion, each test file with what it proves and how many tests it has, the test helpers, and what the suites do not cover.
> **Where to go for the rest:** the commands are in [REFERENCE.md](REFERENCE.md#1-commands-and-scripts); a red test, in [WHEN-IT-BREAKS.md](WHEN-IT-BREAKS.md#2-the-gate).

## Contents

1. [The acceptance criterion](#1-the-acceptance-criterion)
2. [The suites](#2-the-suites)
3. [Helpers and fixture](#3-helpers-and-fixture)
4. [What the suites do not cover](#4-what-the-suites-do-not-cover)

## 1. The acceptance criterion

A change is done when `yarn verificar` exits 0 on the machine and the `verificar` workflow is green on the pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). On top of that, from [CLAUDE.md](../CLAUDE.md) and [CONTRIBUTING.md](../CONTRIBUTING.md): every new rule comes with a test that fails without it, and the mutant is killed before saying done (break the rule on purpose, see the test go red, restore it). A test is never weakened for the gate to pass ([`.claude/loop.md`](../.claude/loop.md)).

```bash
yarn verificar   # lint, format, tests, app check
yarn test        # only the tests
```

The tests use only `node:test` and `node:assert`, with no test framework dependency.

## 2. The suites

Counts measured on 18/11/2026 by counting `test(` calls per file: 133 tests in total, the same number `yarn test` reported that day.

| File                                                                  | Tests | What it proves                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`test/contrato.test.js`](../test/contrato.test.js)                   | 9     | the locked list of six mandatory and six optional capabilities, every capability has a reason, `verificarSistema` returns every problem, refuses another contract version and a wrong shape                                          |
| [`test/definir-app.test.js`](../test/definir-app.test.js)             | 9     | `definirApp` refuses a bad id or a missing `montar` at once; `mount` passes the defaults, refuses an incomplete system before mounting, `desmontar` twice releases once                                                              |
| [`test/manifesto.test.js`](../test/manifesto.test.js)                 | 12    | `validarManifesto`: unknown fields, id, version, layer, languages per layer, icon, colour, category, window, capabilities, author and licence                                                                                        |
| [`test/verificacao.test.js`](../test/verificacao.test.js)             | 14    | the fixture passes every `app check` section; each rule fails what it says; comments do not count                                                                                                                                    |
| [`test/opcionais.test.js`](../test/opcionais.test.js)                 | 33    | `colecoes` (stamps, field-level update, account switching, no fake writes), `ia` (one panel per window, app actions), `arquivos.salvar`, `abertura`, notice title, the development system's optionals, the `colecoes` manifest field |
| [`test/arquivos-e-janela.test.js`](../test/arquivos-e-janela.test.js) | 25    | folders and type filters, the 0.2.0 system refused for 0.3.0 `arquivos`, the ref vault, listing only declared folders, "open with", `colecoes.ler`, full screen, `pastas` and `abre` in the manifest and in the `app check`          |
| [`test/anexos.test.js`](../test/anexos.test.js)                       | 11    | the attachment id and size ceiling, persistence across sessions, isolation by app and account, `sem-conta`, the development system                                                                                                   |
| [`test/hosts.test.js`](../test/hosts.test.js)                         | 14    | the storage key space and failure handling, the fake system's record, the development system (localStorage, private mode, language from URL, low-end mode), the fake window                                                          |
| [`test/idiomas.test.js`](../test/idiomas.test.js)                     | 2     | the ten languages in the house order, and `normalizarIdioma`                                                                                                                                                                         |
| [`test/tag-na-main.test.js`](../test/tag-na-main.test.js)             | 4     | a `main` commit passes, a PR-only commit fails, squash is the failing case, a hook's `GIT_DIR` does not pick the repository, an unknown commit is a usage error                                                                      |

## 3. Helpers and fixture

| Path                                                        | What it is                                                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`test/fixtures/app-ok/`](../test/fixtures/app-ok/app.json) | a complete valid app (a counter without Vue): `app.json`, ten `i18n` files, `public/icone.svg` with its `ASSETS.md` row, `package.json` without install scripts |
| [`test/janela-falsa.js`](../test/janela-falsa.js)           | a toy browser window and DOM with only what the fake window uses; `storageQuebrado` imitates Safari's private mode                                              |

## 4. What the suites do not cover

- **The RoqueOS system.** It lives in `roqueos-front` and is tested there ([INTEGRATIONS.md](INTEGRATIONS.md#3-a-system-roqueos)).
- **A real browser.** The development system is tested against the toy DOM, not rendered; the fake window has not been checked in a browser by this documentation.
- **Mutation testing as a tool.** Killing the mutant is a manual step of the criterion; there is no mutation tool in the gate.
- **Coverage.** No coverage number is measured.
