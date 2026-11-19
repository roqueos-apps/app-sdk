# Integrations

_English | [Português](pt-BR/INTEGRACOES.md)_

> **Who it is for:** whoever connects something to the SDK: an app repository, the RoqueOS system in `roqueos-front`, the interface kit, a CI or a test harness.
> **What is here:** the surfaces the SDK offers outward, what each consumer uses and how, and which version each known consumer pins.
> **Where to go for the rest:** the exact exports and shapes are in [REFERENCE.md](REFERENCE.md); how the pieces work inside, in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contents

1. [The surfaces](#1-the-surfaces)
2. [An app repository](#2-an-app-repository)
3. [A system: RoqueOS](#3-a-system-roqueos)
4. [The app check as CLI and as library](#4-the-app-check-as-cli-and-as-library)
5. [Who pins which version](#5-who-pins-which-version)
6. [Test harnesses](#6-test-harnesses)

## 1. The surfaces

The SDK has no API over the network, no MCP and no webhook. What crosses outward is code and a CLI:

| Surface                                                   | Who uses it                               | Form                                                                                        |
| --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| the package `@roqueos-apps/app-sdk` and its four subpaths | apps, `roqueos-front`, `@roqueos-apps/ui` | ES modules, installed as a git dependency pinned by tag ([`package.json`](../package.json)) |
| the `app` bin (`app check`)                               | the gate of every app repository          | Node CLI, text or `--json` output, exit 0, 1 or 2 ([`bin/app.mjs`](../bin/app.mjs))         |
| the `window.__ROS_E2E__` global                           | Playwright or Cypress harnesses           | an object the harness seeds before the page scripts ([`src/e2e.js`](../src/e2e.js))         |

## 2. An app repository

An app depends on the SDK in its `package.json` (`"@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.3.0"`), and uses:

| What                                      | From                                               | For                                                       |
| ----------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `definirApp`                              | `@roqueos-apps/app-sdk`                            | the default export of `src/index.js`, what RoqueOS mounts |
| `montarNaJanelaFalsa`                     | `@roqueos-apps/app-sdk/sistema-de-desenvolvimento` | `yarn dev`                                                |
| `criarSistemaFalso`, `criarBancoDeAnexos` | `@roqueos-apps/app-sdk/sistema-falso`              | the app's tests                                           |
| `app check`                               | the `app` bin                                      | the app's gate and CI                                     |
| `ErroDoSistema`, `CODIGOS_DE_ERRO`        | `@roqueos-apps/app-sdk`                            | deciding by `codigo` what to do when a capability fails   |

The app carries `app.json`, `i18n/<idioma>.json` and, if it has `public/`, an `ASSETS.md`. The maintenance routine of an app is the same [`.claude/loop.md`](../.claude/loop.md) as here.

## 3. A system: RoqueOS

The RoqueOS system lives in the closed `roqueos-front` and pins the SDK by tag in `dependencies` and in `resolutions`, so the app and the system share a single copy and a new app on an old system does not get to mount ([`src/contrato.js`](../src/contrato.js)). As read in the local clone on 18/11/2026:

| Where in `roqueos-front`                                                               | What it uses                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/services/apps/sistemaDoRoqueOS.js`                                                | the contract fulfilled on top of the stores; imports from `@roqueos-apps/app-sdk` and `/armazenamento`         |
| `src/services/apps/colecoesDoRoqueOS.js`, `arquivosDoRoqueOS.js`, `anexosDoRoqueOS.js` | the optional capabilities on the real backend                                                                  |
| `scripts/apps-de-primeira-parte.mjs`                                                   | `validarManifesto` and `IDIOMAS`, to generate the app registry from the installed manifests                    |
| `tests/unit/architecture/apps-de-primeira-parte.spec.js`                               | `verificarRepo` with `semPackage` on the apps still inside the front; `VARIAVEIS_DO_SISTEMA` against the theme |

A new system must pass `verificarSistema(sistema, { exigidas })` for every app it mounts; the fake system ([`src/host/falso.js`](../src/host/falso.js)) is the reference for the semantics of each optional.

## 4. The app check as CLI and as library

As CLI, `node bin/app.mjs check [folder] [--sdk] [--json]`. The JSON form, for tools:

```json
{
  "ok": false,
  "pasta": "/abs/path/app",
  "secoes": [{ "secao": "manifesto", "problemas": ["app.json: ..."] }]
}
```

As library, `verificarRepo(raiz, { sdk, semPackage })` from `@roqueos-apps/app-sdk/verificacao` returns the same `secoes` array, and each `conferir*` section is exported on its own ([REFERENCE.md](REFERENCE.md#6-the-app-check-sections)).

## 5. Who pins which version

Read from the `package.json` of the local clones on 18/11/2026; a clone can be behind its remote, so this is not proof of what each `main` pins today.

| Consumer                  | Tag      |
| ------------------------- | -------- |
| `roqueos-front`           | `v0.3.0` |
| `lousa`                   | `v0.3.0` |
| `camera`                  | `v0.3.0` |
| `notas`                   | `v0.2.0` |
| `qrcode`                  | `v0.2.0` |
| `ui` (`@roqueos-apps/ui`) | `v0.2.0` |
| `calculadora`             | `v0.1.0` |

## 6. Test harnesses

A Playwright or Cypress harness seeds `window.__ROS_E2E__` before any page script. The app reads it with `emModoE2E()` and `estadoE2E(chave)` to install its QA hook and skip what the harness cannot do (sensor or camera permission). In production nobody writes the global, and the two functions return `false` and `null` ([`src/e2e.js`](../src/e2e.js)).
