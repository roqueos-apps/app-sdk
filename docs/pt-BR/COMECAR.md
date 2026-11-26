# Começar

_[English](../GETTING-STARTED.md) | Português_

> **Para quem:** quem chega ao repositório pela primeira vez, para mudar o SDK ou para construir um app em cima dele.
> **O que tem aqui:** os pré-requisitos com o comando que confere cada um, os passos do clone ao gate verde, o `app check` no app de exemplo e o primeiro teste de um app contra o sistema falso.
> **Onde ir para o resto:** todo comando e export está em [REFERENCIA.md](REFERENCIA.md); se um passo falhar, [QUANDO-QUEBRA.md](QUANDO-QUEBRA.md).

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Clonar e instalar](#2-clonar-e-instalar)
3. [Rodar o gate](#3-rodar-o-gate)
4. [Ver o app check funcionar](#4-ver-o-app-check-funcionar)
5. [Usar o SDK num app](#5-usar-o-sdk-num-app)
6. [Erros de primeira vez](#6-erros-de-primeira-vez)

## 1. Pré-requisitos

| O quê | Versão                                                           | Como conferir   |
| ----- | ---------------------------------------------------------------- | --------------- |
| Node  | 22 ou mais novo (`engines` no `package.json`); o `.nvmrc` diz 24 | `node -v`       |
| Yarn  | 1, `yarn@1.22.22` no `packageManager`                            | `yarn -v`       |
| Git   | qualquer recente                                                 | `git --version` |

Use o Yarn, não o npm: o repositório tem `yarn.lock`, e o gancho do `roqueos-kit` recusa `npm` e `npx` aqui.

## 2. Clonar e instalar

```bash
git clone https://github.com/roqueos-apps/app-sdk.git
cd app-sdk
yarn install --ignore-scripts
```

O `--ignore-scripts` é a regra da casa em todo install: nenhum pacote roda código na sua máquina na hora de instalar. A última linha de um install bom é `Done in ...`.

## 3. Rodar o gate

```bash
yarn verificar
```

Ele roda o ESLint, o Prettier em modo de conferência, as suítes do `node:test` e o `app check` do próprio SDK, nessa ordem, e para no primeiro que falha. É o mesmo comando que o CI roda em todo pull request ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). Verde termina assim (medido em 18/11/2026: 133 testes em 33 suítes):

```text
# tests 133
# pass 133
# fail 0
$ node bin/app.mjs check --sdk
ok        scripts de instalação

ok, o repo cumpre o contrato.
```

## 4. Ver o app check funcionar

O repositório leva um app válido completo em [`test/fixtures/app-ok/`](../../test/fixtures/app-ok/app.json). Rode o check nele:

```bash
node bin/app.mjs check test/fixtures/app-ok
```

Toda seção imprime `ok` e a última linha é `ok, o repo cumpre o contrato.`. Para ver reprovar, copie o fixture para outro lugar, acrescente `"postinstall": "x"` no `package.json` dele e rode de novo: a seção `scripts de instalação` imprime `REPROVOU` com o motivo, e o comando sai com 1. O que cada seção quer dizer está em [REFERENCIA.md](REFERENCIA.md#6-as-seções-do-app-check).

## 5. Usar o SDK num app

No repo do app, dependa do SDK por tag, sem registro:

```json
{ "dependencies": { "@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.3.0" } }
```

Defina o app com `definirApp`, liste no `app.json` as capacidades opcionais que ele usa, e monte na janela falsa no `yarn dev`:

```js
import { montarNaJanelaFalsa } from '@roqueos-apps/app-sdk/sistema-de-desenvolvimento'
import manifesto from '../app.json'
import app from '../src/index.js'

montarNaJanelaFalsa(app, { manifesto })
```

A janela tem o tamanho do `app.json`, o nome no idioma atual e um seletor dos dez idiomas; `?idioma=ar-AR` na URL abre da direita para a esquerda. O primeiro teste do app, contra o sistema falso, prova que ele monta, acompanha a troca de idioma e solta todo ouvinte:

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

Este teste rodou contra o app de exemplo do fixture em 18/11/2026 e passou. Depois ponha o `app check` no gate do app: o pacote o expõe como o bin `app` ([`bin/app.mjs`](../../bin/app.mjs)).

## 6. Erros de primeira vez

| O que aparece                                                                         | Onde olhar                                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| o gancho do kit recusa `npm` ou `npx`                                                 | [QUANDO-QUEBRA.md, instalar](QUANDO-QUEBRA.md#1-instalar)                         |
| `[warn] Code style issues found in the above file. Run Prettier with --write to fix.` | [QUANDO-QUEBRA.md, o gate](QUANDO-QUEBRA.md#2-o-gate)                             |
| `REPROVOU` numa seção do `app check`                                                  | [QUANDO-QUEBRA.md, o app check](QUANDO-QUEBRA.md#3-o-app-check)                   |
| `o sistema não cumpre o contrato: ...` ao montar                                      | [QUANDO-QUEBRA.md, montar e capacidades](QUANDO-QUEBRA.md#4-montar-e-capacidades) |
