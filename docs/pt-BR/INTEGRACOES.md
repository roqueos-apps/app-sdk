# Integrações

_[English](../INTEGRATIONS.md) | Português_

> **Para quem:** quem liga alguma coisa no SDK: um repo de app, o sistema do RoqueOS no `roqueos-front`, o kit de interface, um CI ou um harness de teste.
> **O que tem aqui:** as superfícies que o SDK oferece para fora, o que cada consumidor usa e como, e que versão cada consumidor conhecido pina.
> **Onde ir para o resto:** os exports e as formas exatas estão em [REFERENCIA.md](REFERENCIA.md); como as peças funcionam por dentro, em [ARQUITETURA.md](ARQUITETURA.md).

## Sumário

1. [As superfícies](#1-as-superfícies)
2. [Um repo de app](#2-um-repo-de-app)
3. [Um sistema: o RoqueOS](#3-um-sistema-o-roqueos)
4. [O app check como CLI e como biblioteca](#4-o-app-check-como-cli-e-como-biblioteca)
5. [Quem pina que versão](#5-quem-pina-que-versão)
6. [Harnesses de teste](#6-harnesses-de-teste)

## 1. As superfícies

O SDK não tem API pela rede, nem MCP, nem webhook. O que sai para fora é código e um CLI:

| Superfície                                               | Quem usa                                         | Forma                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| o pacote `@roqueos-apps/app-sdk` e os quatro subcaminhos | os apps, o `roqueos-front`, o `@roqueos-apps/ui` | módulos ES, instalados como dependência git pinada por tag ([`package.json`](../../package.json)) |
| o bin `app` (`app check`)                                | o gate de todo repo de app                       | CLI de Node, saída em texto ou `--json`, saída 0, 1 ou 2 ([`bin/app.mjs`](../../bin/app.mjs))     |
| o global `window.__ROS_E2E__`                            | harnesses de Playwright ou Cypress               | um objeto que o harness semeia antes dos scripts da página ([`src/e2e.js`](../../src/e2e.js))     |

## 2. Um repo de app

O app depende do SDK no `package.json` dele (`"@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.3.0"`) e usa:

| O quê                                     | De onde                                            | Para quê                                                      |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `definirApp`                              | `@roqueos-apps/app-sdk`                            | o export padrão do `src/index.js`, o que o RoqueOS monta      |
| `montarNaJanelaFalsa`                     | `@roqueos-apps/app-sdk/sistema-de-desenvolvimento` | o `yarn dev`                                                  |
| `criarSistemaFalso`, `criarBancoDeAnexos` | `@roqueos-apps/app-sdk/sistema-falso`              | os testes do app                                              |
| `app check`                               | o bin `app`                                        | o gate e o CI do app                                          |
| `ErroDoSistema`, `CODIGOS_DE_ERRO`        | `@roqueos-apps/app-sdk`                            | decidir pelo `codigo` o que fazer quando uma capacidade falha |

O app leva o `app.json`, os `i18n/<idioma>.json` e, se tem `public/`, um `ASSETS.md`. A rotina de manutenção de um app é o mesmo [`.claude/loop.md`](../../.claude/loop.md) daqui.

## 3. Um sistema: o RoqueOS

O sistema do RoqueOS mora no `roqueos-front`, fechado, e pina o SDK por tag em `dependencies` e em `resolutions`, para o app e o sistema usarem uma cópia só e app novo em sistema velho não chegar a montar ([`src/contrato.js`](../../src/contrato.js)). Como lido no clone local em 18/11/2026:

| Onde no `roqueos-front`                                                                | O que usa                                                                                                |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/services/apps/sistemaDoRoqueOS.js`                                                | o contrato cumprido por cima das stores; importa de `@roqueos-apps/app-sdk` e de `/armazenamento`        |
| `src/services/apps/colecoesDoRoqueOS.js`, `arquivosDoRoqueOS.js`, `anexosDoRoqueOS.js` | as capacidades opcionais no backend de verdade                                                           |
| `scripts/apps-de-primeira-parte.mjs`                                                   | `validarManifesto` e `IDIOMAS`, para gerar o registro de apps a partir dos manifestos instalados         |
| `tests/unit/architecture/apps-de-primeira-parte.spec.js`                               | `verificarRepo` com `semPackage` nos apps que ainda moram no front; `VARIAVEIS_DO_SISTEMA` contra o tema |

Um sistema novo precisa passar no `verificarSistema(sistema, { exigidas })` para cada app que monta; o sistema falso ([`src/host/falso.js`](../../src/host/falso.js)) é a referência da semântica de cada opcional.

## 4. O app check como CLI e como biblioteca

Como CLI, `node bin/app.mjs check [pasta] [--sdk] [--json]`. A forma JSON, para ferramentas:

```json
{
  "ok": false,
  "pasta": "/abs/path/app",
  "secoes": [{ "secao": "manifesto", "problemas": ["app.json: ..."] }]
}
```

Como biblioteca, `verificarRepo(raiz, { sdk, semPackage })` de `@roqueos-apps/app-sdk/verificacao` devolve o mesmo vetor `secoes`, e cada seção `conferir*` é exportada sozinha ([REFERENCIA.md](REFERENCIA.md#6-as-seções-do-app-check)).

## 5. Quem pina que versão

Lido do `package.json` dos clones locais em 18/11/2026; um clone pode estar atrás do remoto, então isto não prova o que cada `main` pina hoje.

| Consumidor                | Tag      |
| ------------------------- | -------- |
| `roqueos-front`           | `v0.3.0` |
| `lousa`                   | `v0.3.0` |
| `camera`                  | `v0.3.0` |
| `notas`                   | `v0.2.0` |
| `qrcode`                  | `v0.2.0` |
| `ui` (`@roqueos-apps/ui`) | `v0.2.0` |
| `calculadora`             | `v0.1.0` |

## 6. Harnesses de teste

Um harness de Playwright ou Cypress semeia `window.__ROS_E2E__` antes de qualquer script da página. O app lê com `emModoE2E()` e `estadoE2E(chave)` para instalar o gancho de QA e pular o que o harness não consegue fazer (permissão de sensor ou de câmera). Em produção ninguém escreve o global, e as duas funções devolvem `false` e `null` ([`src/e2e.js`](../../src/e2e.js)).
