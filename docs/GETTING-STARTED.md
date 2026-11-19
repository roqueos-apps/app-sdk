# Getting started

_English | [Português](pt-BR/COMECAR.md)_

> **Who it is for:** whoever arrives at the repository for the first time, to change the SDK or to build an app on it.
> **What is here:** the prerequisites with the command that checks each one, the steps from clone to green gate, the `app check` on the example app, and the first app test against the fake system.
> **Where to go for the rest:** every command and export is in [REFERENCE.md](REFERENCE.md); if a step fails, [WHEN-IT-BREAKS.md](WHEN-IT-BREAKS.md).

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and install](#2-clone-and-install)
3. [Run the gate](#3-run-the-gate)
4. [See the app check work](#4-see-the-app-check-work)
5. [Use the SDK in an app](#5-use-the-sdk-in-an-app)
6. [First-time errors](#6-first-time-errors)

## 1. Prerequisites

| What | Version                                                     | How to check    |
| ---- | ----------------------------------------------------------- | --------------- |
| Node | 22 or newer (`engines` in `package.json`); `.nvmrc` says 24 | `node -v`       |
| Yarn | 1, `yarn@1.22.22` in `packageManager`                       | `yarn -v`       |
| Git  | any recent                                                  | `git --version` |

Use Yarn, not npm: the repository has a `yarn.lock`, and the `roqueos-kit` hook refuses `npm` and `npx` here.

## 2. Clone and install

```bash
git clone https://github.com/roqueos-apps/app-sdk.git
cd app-sdk
yarn install --ignore-scripts
```

`--ignore-scripts` is the house rule for every install: no package gets to run code on your machine at install time. The last line of a good install is `Done in ...`.

## 3. Run the gate

```bash
yarn verificar
```

It runs ESLint, Prettier in check mode, the `node:test` suites and the `app check` of the SDK itself, in that order, and stops at the first that fails. It is the same command CI runs on every pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Green ends like this (measured on 18/11/2026: 133 tests in 33 suites):

```text
# tests 133
# pass 133
# fail 0
$ node bin/app.mjs check --sdk
ok        scripts de instalação

ok, o repo cumpre o contrato.
```

## 4. See the app check work

The repository carries a complete valid app in [`test/fixtures/app-ok/`](../test/fixtures/app-ok/app.json). Run the check on it:

```bash
node bin/app.mjs check test/fixtures/app-ok
```

Every section prints `ok` and the last line is `ok, o repo cumpre o contrato.`. To see it fail, copy the fixture somewhere else, add `"postinstall": "x"` to its `package.json` and run again: the `scripts de instalação` section prints `REPROVOU` with the reason, and the command exits with 1. The meaning of each section is in [REFERENCE.md](REFERENCE.md#6-the-app-check-sections).

## 5. Use the SDK in an app

In the app repository, depend on the SDK by tag, with no registry:

```json
{ "dependencies": { "@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.3.0" } }
```

Define the app with `definirApp`, list the optional capabilities it uses in `app.json`, and mount it in the fake window in `yarn dev`:

```js
import { montarNaJanelaFalsa } from '@roqueos-apps/app-sdk/sistema-de-desenvolvimento'
import manifesto from '../app.json'
import app from '../src/index.js'

montarNaJanelaFalsa(app, { manifesto })
```

The window has the size from `app.json`, the name in the current language and a picker of the ten languages; `?idioma=ar-AR` in the URL opens it right to left. The first app test, against the fake system, proves the app mounts, follows a language change and releases every listener:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarSistemaFalso } from '@roqueos-apps/app-sdk/sistema-falso'
import app from '../src/index.js'

test('o app monta, troca de idioma e solta tudo ao desmontar', () => {
  const falso = criarSistemaFalso({ appId: app.id })
  const montagem = app.mount({}, falso.sistema)
  falso.mudarIdioma('en-US')
  montagem.desmontar()
  assert.equal(falso.ouvintesVivos(), 0)
})
```

This test was run against the example app of the fixture on 18/11/2026 and passed. Then put the `app check` in the app's gate: the package exposes it as the `app` bin ([`bin/app.mjs`](../bin/app.mjs)).

## 6. First-time errors

| What appears                                                                          | Where to look                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| the kit hook refuses `npm` or `npx`                                                   | [WHEN-IT-BREAKS.md, installing](WHEN-IT-BREAKS.md#1-installing)                               |
| `[warn] Code style issues found in the above file. Run Prettier with --write to fix.` | [WHEN-IT-BREAKS.md, the gate](WHEN-IT-BREAKS.md#2-the-gate)                                   |
| `REPROVOU` in an `app check` section                                                  | [WHEN-IT-BREAKS.md, the app check](WHEN-IT-BREAKS.md#3-the-app-check)                         |
| `o sistema não cumpre o contrato: ...` when mounting                                  | [WHEN-IT-BREAKS.md, mounting and capabilities](WHEN-IT-BREAKS.md#4-mounting-and-capabilities) |
