# Extending

_English | [Português](pt-BR/ESTENDER.md)_

> **Who it is for:** whoever needs the SDK to offer something it does not offer yet, or to check something it does not check yet.
> **What is here:** how to add an optional capability, a function to an existing optional, an `app check` rule, a CSS variable, a folder, an error code and a manifest field, with the files each step touches and the check that enforces it.
> **Where to go for the rest:** the versioning rules are in [OPERATIONS.md](OPERATIONS.md#3-changing-the-contract-without-breaking); the test criterion, in [TESTING.md](TESTING.md).

Every extension starts with an issue ([CONTRIBUTING.md](../CONTRIBUTING.md)) and ends with `yarn verificar` green, a test that fails without the change, and a `CHANGELOG.md` entry.

## Contents

1. [A new optional capability](#1-a-new-optional-capability)
2. [A function in an existing optional](#2-a-function-in-an-existing-optional)
3. [A new app check rule](#3-a-new-app-check-rule)
4. [A CSS variable, a folder, an error code](#4-a-css-variable-a-folder-an-error-code)
5. [A manifest field](#5-a-manifest-field)
6. [What is not extended here](#6-what-is-not-extended-here)

## 1. A new optional capability

A capability is born optional, with a written reason, in the wave of the first app that needs it ([CLAUDE.md](../CLAUDE.md)). The 0.3.0 `anexos` and `janela` are the most recent examples to copy.

| Step | File                                                                                                                                                         | What to do                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [`src/contrato.js`](../src/contrato.js)                                                                                                                      | add the entry to `CAPACIDADES` with `obrigatoria: false`, the `forma` and the `porque`. `OPCIONAIS` is derived from it, so the manifest and the declared-optionals rule of the `app check` pick it up with no other change |
| 2    | `src/<capacidade>.js`                                                                                                                                        | the semantics every system shares (checks, ids, limits), with the guarantees written at the top, as in [`src/anexos.js`](../src/anexos.js)                                                                                 |
| 3    | [`src/erros.js`](../src/erros.js)                                                                                                                            | any new code the capability rejects with                                                                                                                                                                                   |
| 4    | [`src/index.js`](../src/index.js)                                                                                                                            | export the shared pieces                                                                                                                                                                                                   |
| 5    | [`src/host/falso.js`](../src/host/falso.js), [`src/host/desenvolvimento.js`](../src/host/desenvolvimento.js), and an in-memory host in `src/host/` if needed | implement it with the same semantics as RoqueOS, plus the levers a test needs in the fake system                                                                                                                           |
| 6    | `test/`                                                                                                                                                      | the tests: shape in the contract, semantics in the fake system, the development system, and a system without it refusing an app that requires it                                                                           |
| 7    | [`test/contrato.test.js`](../test/contrato.test.js)                                                                                                          | the list of capabilities is locked there, on purpose                                                                                                                                                                       |
| 8    | [README.md](../README.md), [REFERENCE.md](REFERENCE.md), `CHANGELOG.md`                                                                                      | the capability in the tables, and the minor version                                                                                                                                                                        |

Then `roqueos-front` implements it in its RoqueOS system, and the app that needed it bumps the pin last.

## 2. A function in an existing optional

Add the key to the capability's `forma` in [`src/contrato.js`](../src/contrato.js) and implement it in the three systems. It is a minor version: an old app is still served, and a system without the function refuses, with the reason, an app that requires the capability. The test "o sistema da 0.2.0, só com salvar, não serve a app que exige arquivos" in [`test/arquivos-e-janela.test.js`](../test/arquivos-e-janela.test.js) is the model. Removing a function, or changing its shape or meaning, is a new contract version instead ([OPERATIONS.md](OPERATIONS.md#3-changing-the-contract-without-breaking)).

## 3. A new app check rule

| Step | File                                                                                                          | What to do                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [`src/verificacao.js`](../src/verificacao.js)                                                                 | an exported `conferirX(raiz)` returning a list of problems, each with file and line when there is one; the comment says the reason, and which incident it came from |
| 2    | `verificarRepo` in the same file                                                                              | a new `{ secao, problemas }`; the section name is what the CLI prints                                                                                               |
| 3    | [`test/verificacao.test.js`](../test/verificacao.test.js)                                                     | a test under "cada regra reprova o que diz" that fails without the rule, and the fixture still passing whole                                                        |
| 4    | [REFERENCE.md](REFERENCE.md#6-the-app-check-sections), [WHEN-IT-BREAKS.md](WHEN-IT-BREAKS.md#3-the-app-check) | the section and its literal message                                                                                                                                 |

Read code with `semComentarios` first, so a commented line does not count. No warnings: the rule fails or it does not exist ([`bin/app.mjs`](../bin/app.mjs)). Before saying it is done, kill the mutant: break the rule on purpose and see the test fail ([CLAUDE.md](../CLAUDE.md)).

## 4. A CSS variable, a folder, an error code

| Piece        | Where                                                               | What else moves                                                                                                                                          |
| ------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS variable | `VARIAVEIS_DO_SISTEMA` in [`src/variaveis.js`](../src/variaveis.js) | it must exist in RoqueOS's theme: a test in `roqueos-front` fails when one of the list is missing. Adding is minor, removing is breaking                 |
| folder       | `PASTAS_DE_ARQUIVOS` in [`src/arquivos.js`](../src/arquivos.js)     | an identifier without accents (the label the person sees is the system's); the RoqueOS system maps it; `pastas` in the manifest accepts it automatically |
| error code   | `CODIGOS_DE_ERRO` in [`src/erros.js`](../src/erros.js)              | the description in the source, and the table in [REFERENCE.md](REFERENCE.md#3-error-codes)                                                               |

## 5. A manifest field

Add it to `CAMPOS` in [`src/manifesto.js`](../src/manifesto.js) with its validation in `validarManifesto`, and a test in [`test/manifesto.test.js`](../test/manifesto.test.js). Without the entry in `CAMPOS`, every `app.json` that uses the field fails, which is the point: an unknown field is never ignored. `roqueos-front` reads manifests at build time ([INTEGRATIONS.md](INTEGRATIONS.md)), so a field that changes RoqueOS's behaviour also needs the change there.

## 6. What is not extended here

- **A language.** The ten are locked by [`test/idiomas.test.js`](../test/idiomas.test.js) and the same list lives in `jogo-sdk`; a new language is a change in the whole of RoqueOS ([`src/idiomas.js`](../src/idiomas.js)).
- **A mandatory capability.** The six come from `jogo-sdk`; a new one is born optional.
- **A runtime dependency or an install script.** Not allowed ([CLAUDE.md](../CLAUDE.md)).
