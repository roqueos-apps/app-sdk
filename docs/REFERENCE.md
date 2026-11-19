# Reference

_English | [Português](pt-BR/REFERENCIA.md)_

> **Who it is for:** whoever needs the exact name, shape or code of something while writing an app, a system or a change to the SDK.
> **What is here:** commands and scripts, the package entry points and exports, every capability with its shape, the error codes, every `app.json` field, the `app check` sections, the development and fake system options, and the files of the repository.
> **Where to go for the rest:** why each piece is the way it is, in [ARCHITECTURE.md](ARCHITECTURE.md); how to add one, in [EXTENDING.md](EXTENDING.md).

Names in code are Portuguese, as in the source; they are not translated here.

## Contents

1. [Commands and scripts](#1-commands-and-scripts)
2. [Capabilities](#2-capabilities)
3. [Error codes](#3-error-codes)
4. [Package entry points and exports](#4-package-entry-points-and-exports)
5. [The `app.json` manifest](#5-the-appjson-manifest)
6. [The `app check` sections](#6-the-app-check-sections)
7. [Development system](#7-development-system)
8. [Fake system](#8-fake-system)
9. [Constants and limits](#9-constants-and-limits)
10. [Files and folders](#10-files-and-folders)

## 1. Commands and scripts

| Command                                            | What it does                                                                                           | Exit codes                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `yarn install --ignore-scripts`                    | installs the dev dependencies (CI uses `--frozen-lockfile` as well)                                    | yarn's                                                                         |
| `yarn verificar`                                   | `yarn lint && yarn format:check && yarn test && yarn app:check`; the gate, the same in CI and pre-push | 0 green, non-zero at the first step that fails                                 |
| `yarn test`                                        | `node --test test/*.test.js`                                                                           | 0 all pass, 1 any failure                                                      |
| `yarn lint`                                        | `eslint .` with [`eslint.config.js`](../eslint.config.js)                                              | 0 clean, 1 problems                                                            |
| `yarn format:check` / `yarn format`                | `prettier --check .` / `prettier --write .` with [`.prettierrc`](../.prettierrc), Markdown included    | 0 clean, 1 files to format                                                     |
| `yarn app:check`                                   | `node bin/app.mjs check --sdk`: only the install-scripts section                                       | 0 ok, 1 problem                                                                |
| `node bin/app.mjs check [folder] [--sdk] [--json]` | the `app check` on an app repository (current directory by default)                                    | 0 ok, 1 any problem, 2 wrong usage (`uso: app check [pasta] [--sdk] [--json]`) |
| `node bin/tag-na-main.mjs <commit> [<main ref>]`   | is the commit an ancestor of `main` (default `origin/main`)?                                           | 0 yes, 1 no, 2 missing argument or git did not find the commit                 |

## 2. Capabilities

All in [`src/contrato.js`](../src/contrato.js). The six mandatory ones every system has; the optional ones an app lists in `capacidades` in `app.json`, and `mount` refuses a system without them.

| Capability      | Mandatory | Shape                                                                                                                                  | What for                                                                                                                                           | Since |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `identidade`    | yes       | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | `{ uid, nome }`, or `{ uid: null, nome: null }` for a guest                                                                                        | 0.1.0 |
| `avisar`        | yes       | `avisar(mensagem, { tipo, fixo, titulo })`                                                                                             | what the person must read; `tipo` is `info`, `sucesso`, `aviso` or `erro`; `fixo: true` stays until closed; `titulo` since 0.2.0                   | 0.1.0 |
| `idioma`        | yes       | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | one of the ten languages; the change arrives with the window open                                                                                  | 0.1.0 |
| `desempenho`    | yes       | `modoLeve()`                                                                                                                           | the device asks for the low-end profile                                                                                                            | 0.1.0 |
| `metricas`      | yes       | `evento(nome, dados)`                                                                                                                  | usage, with event names that do not change without reason                                                                                          | 0.1.0 |
| `armazenamento` | yes       | `ler(chave)`, `gravar(chave, valor)`, `apagar(chave)`                                                                                  | text in the `roqueos:<app>:<chave>` space, on the device; failure is `null` or `false`, never an exception                                         | 0.1.0 |
| `colecoes`      | no        | `abrir(nome)` → `{ observar(fn, aoErrar), ler(id), criar(id, campos), atualizar(id, campos), apagar(id) }`                             | documents in the person's account, real time, every device; `ler(id)` since 0.3.0 ([`src/colecoes.js`](../src/colecoes.js))                        | 0.2.0 |
| `ia`            | no        | `abrirPainel({ ancora, tipo, contexto, aplicar, acento, titulo, aoFechar, acoes })` → `{ fechar }`                                     | the system's AI panel over the app's content; `tipo` is `text`, `code` or `read`; `acoes` since 0.3.0 ([`src/ia.js`](../src/ia.js))                | 0.2.0 |
| `arquivos`      | no        | `salvar({ nome, conteudo, tipo, pasta })` → `{ nome, pasta, ref }`, `listar(pasta, { tipos })`, `ler(ref)` → Blob, `abrirPasta(pasta)` | the person's Files by folder and opaque ref; `listar`, `ler` and `abrirPasta` since 0.3.0 ([`src/arquivos.js`](../src/arquivos.js))                | 0.2.0 |
| `abertura`      | no        | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | what the opener sent; the Finder's "open with" arrives as `{ arquivo: { ref, nome, tipo } }` since 0.3.0 ([`src/abertura.js`](../src/abertura.js)) | 0.2.0 |
| `anexos`        | no        | `guardar(blob)` → `{ id }`, `ler(id)` → Blob, `apagar(id)`                                                                             | the app's bytes in the account, under a durable id that never becomes a URL ([`src/anexos.js`](../src/anexos.js))                                  | 0.3.0 |
| `janela`        | no        | `telaCheia(bool)` → state, `emTelaCheia()`, `aoMudarTelaCheia(fn)` → `parar()`                                                         | full screen done by the system ([`src/janela.js`](../src/janela.js))                                                                               | 0.3.0 |

## 3. Error codes

An optional capability that fails rejects with `ErroDoSistema`, which has `name: 'ErroDoSistema'` and a `codigo` from this list ([`src/erros.js`](../src/erros.js)). A code outside the list throws `TypeError` in the constructor. The descriptions are the source's, quoted in Portuguese.

| `codigo`               | Meaning (literal, from the source)                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sem-conta`            | a capacidade guarda na conta, e não há ninguém entrado                                                      |
| `sem-permissao`        | o sistema recusou (a sessão acabou, ou a regra do banco não deixa)                                          |
| `sem-rede`             | o sistema precisa da rede para isso, e ela não está lá                                                      |
| `colecao-desconhecida` | a coleção não está no mapa do sistema para este app                                                         |
| `campo-do-sistema`     | o app mandou um campo que é o sistema quem grava (os carimbos de data)                                      |
| `id-invalido`          | o id do documento está fora do formato                                                                      |
| `valor-invalido`       | o valor não é um dado simples (texto, número, sim/não, lista, objeto)                                       |
| `pasta-invalida`       | a pasta não está entre as que o sistema deixa o app gravar                                                  |
| `pasta-nao-declarada`  | o app lê ou mostra uma pasta que não declarou em "pastas" no app.json                                       |
| `ref-invalida`         | a referência de arquivo não veio deste sistema nesta sessão (fabricada, de outro app, ou guardada de ontem) |
| `nao-encontrado`       | o arquivo, o documento ou o anexo não existe (mais), ou não é deste app                                     |
| `grande-demais`        | o conteúdo passa do tamanho que a capacidade aceita                                                         |
| `indisponivel`         | o sistema não oferece isso aqui (fora do RoqueOS, por exemplo)                                              |

## 4. Package entry points and exports

| Entry point (`exports` in [`package.json`](../package.json)) | File                                                            | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@roqueos-apps/app-sdk`                                      | [`src/index.js`](../src/index.js)                               | `definirApp`; `VERSAO_DO_CONTRATO`, `CAPACIDADES`, `OBRIGATORIAS`, `OPCIONAIS`, `TIPOS_DE_AVISO`, `verificarSistema`; `IDIOMAS`, `IDIOMA_CANONICO`, `IDIOMA_DE_RECUO`, `normalizarIdioma`; `emModoE2E`, `estadoE2E`; `validarManifesto`, `CATEGORIAS`, `CAMADAS`; `VARIAVEIS_DO_SISTEMA`; `ErroDoSistema`, `CODIGOS_DE_ERRO`; `CARIMBOS`, `conferirCampos`, `conferirIdDeDocumento`; `PASTAS_DE_ARQUIVOS`, `conferirArquivo`, `conferirPasta`, `conferirPastaDeclarada`, `conferirTipos`, `criarCofreDeRefs`, `ehPadraoDeTipo`, `entradaDeArquivo`, `ordenarArquivos`, `tipoCasa`; `MAXIMO_DE_ACOES_DE_IA`, `TIPOS_DE_IA`, `conferirPedidoDeIa`; `criarAbertura`; `criarTelaCheia`; `TAMANHO_MAXIMO_DE_ANEXO`, `conferirConteudoDeAnexo`, `conferirIdDeAnexo`, `gerarIdDeAnexo` |
| `@roqueos-apps/app-sdk/sistema-de-desenvolvimento`           | [`src/host/desenvolvimento.js`](../src/host/desenvolvimento.js) | `criarSistemaDeDesenvolvimento`, `montarNaJanelaFalsa`, `CONTA_DE_DESENVOLVIMENTO`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@roqueos-apps/app-sdk/sistema-falso`                        | [`src/host/falso.js`](../src/host/falso.js)                     | `criarSistemaFalso`, `criarBancoDeAnexos`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `@roqueos-apps/app-sdk/armazenamento`                        | [`src/host/armazenamento.js`](../src/host/armazenamento.js)     | `chaveDoApp`, `armazenamentoDoApp`, `armazenamentoEmMemoria`, `storageDoNavegador`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@roqueos-apps/app-sdk/verificacao`                          | [`src/verificacao.js`](../src/verificacao.js)                   | `verificarRepo` and each section (`conferirScriptsDeInstalacao`, `conferirManifesto`, `conferirTextos`, `conferirAssets`, `conferirBanco`, `conferirImportsDoRoqueOS`, `conferirVariaveis`, `conferirCapacidadesDeclaradas`, `conferirPastasDeclaradas`), plus `SCRIPTS_DE_INSTALACAO`, `LICENCAS_DE_ASSET`, `APELIDOS_DO_ROQUEOS`, `chavesFolha`, `semComentarios`, `ehFirebase`, `ehDoRoqueOS`                                                                                                                                                                                                                                                                                                                                                                                |
| `app` (bin)                                                  | [`bin/app.mjs`](../bin/app.mjs)                                 | the `app check` CLI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`definirApp({ id, capacidades = [], montar })` throws `TypeError` for an id outside `^[a-z][a-z0-9]*$`, a missing `montar` or `capacidades` that is not a list. It returns a frozen `{ id, versaoDoContrato, capacidades, mount(el, sistema, { windowId, ativo }) }`. `montar` receives `{ windowId: windowId ?? null, ativo: ativo ?? true }` and must return `{ ativar?, desmontar }`.

## 5. The `app.json` manifest

Checked by `validarManifesto` ([`src/manifesto.js`](../src/manifesto.js)), which returns every problem at once. A field outside this table fails.

| Field              | Required                            | Format                                                                                                                                                        |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | yes                                 | `^[a-z][a-z0-9]*$`; permanent: key of the window, dock, storage and preferences                                                                               |
| `versaoDoContrato` | yes                                 | `1`                                                                                                                                                           |
| `camada`           | yes                                 | `primeira-parte` or `comunidade`                                                                                                                              |
| `nome`             | yes                                 | one text per language: the ten for first party, at least `pt-BR` and `en-US` for community; no other language, no empty text                                  |
| `descricao`        | yes                                 | same as `nome`                                                                                                                                                |
| `icone`            | yes                                 | a Material Icon name (`^[a-z0-9_]+$`) or a path to an SVG in the repository, which must exist                                                                 |
| `cor`              | yes                                 | `#rrggbb`                                                                                                                                                     |
| `categoria`        | yes                                 | `productivity`, `creativity`, `media`, `utilities`, `entertainment`, `social` or `development` (`system` stays out on purpose)                                |
| `janela`           | yes                                 | `{ largura, altura, minLargura, minAltura }` positive integers in pixels, minimum not above the initial size; `maximizavel` boolean, optional; no other field |
| `naLoja`           | no                                  | boolean                                                                                                                                                       |
| `capacidades`      | no                                  | list of optional capabilities only; a mandatory one listed is an error that explains itself                                                                   |
| `colecoes`         | with `colecoes` in `capacidades`    | non-empty list of names `^[a-z][a-zA-Z0-9]*$`, no repeats                                                                                                     |
| `pastas`           | no, needs `arquivos`                | non-empty list from `Documentos`, `Imagens`, `Videos`, no repeats: the folders the app lists and shows                                                        |
| `abre`             | no, needs `abertura` and `arquivos` | non-empty list of type patterns (`image/*`, `application/pdf`), no repeats                                                                                    |
| `autor`            | yes                                 | non-empty text                                                                                                                                                |
| `licenca`          | yes                                 | non-empty text, the SPDX identifier                                                                                                                           |

## 6. The `app check` sections

`verificarRepo(raiz, { sdk, semPackage })` in [`src/verificacao.js`](../src/verificacao.js). With `sdk` only the first section runs; with `semPackage` (an app still inside RoqueOS) the first one is skipped. The section names are printed as they appear here.

| Section (literal)                  | Fails when                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts de instalação`            | `package.json` is missing, or declares `preinstall`, `install`, `postinstall`, `prepare`, `prepack` or `postpack`                                                                                                                                 |
| `manifesto`                        | `app.json` is missing, is not JSON, fails `validarManifesto`, or points `icone` to an SVG that does not exist                                                                                                                                     |
| `textos nos idiomas`               | `i18n/` or `i18n/pt-BR.json` is missing; a required language is missing; a key is missing, extra or empty against `pt-BR`; a file for a language the house does not speak                                                                         |
| `origem dos assets`                | a file in `public/` has no `ASSETS.md` row (path, licence, origin), a licence outside `CC0-1.0`, `CC-BY-4.0`, `MIT`, `BSD-3-Clause`, `autoral` (an `UNLICENSED` package accepts any declared licence but not `?` or `desconhecida`), or no origin |
| `o app não fala com banco`         | `src/` imports `firebase`, `firebase/*` or `@firebase/*`                                                                                                                                                                                          |
| `o app não importa o RoqueOS`      | `src/` imports `quasar` or a RoqueOS alias (`src/`, `app/`, `boot/`, `stores/`, `components/`, `layouts/`, `pages/`, `assets/`, `css/`, with or without `~`) in JS, `.vue` or style                                                               |
| `variáveis do sistema no contrato` | `src/` reads a `var(--ros-*)` outside `VARIAVEIS_DO_SISTEMA`, or declares any `--ros-*` in CSS or JavaScript                                                                                                                                      |
| `capacidades opcionais declaradas` | `src/` uses `sistema.x`, `sistema?.x`, `sistema['x']` or `{ x } = sistema` for an optional not in `capacidades`                                                                                                                                   |
| `pastas declaradas`                | `src/` calls `listar('X')` or `abrirPasta('X')` with a literal folder not in `pastas`                                                                                                                                                             |

Comments are stripped before reading imports and variables (`semComentarios`), so a commented import does not count.

## 7. Development system

`montarNaJanelaFalsa(app, { manifesto, alvo, janela, registro })` mounts the app in a fake RoqueOS window sized from `manifesto.janela` (default 480 by 640), with the name in the current language and a picker of the ten languages, and returns `{ sistema, montagem, mudarIdioma }`. `criarSistemaDeDesenvolvimento({ appId, janela, registro, idioma, colecoes, pastas, aoTelaCheia })` is the system alone ([`src/host/desenvolvimento.js`](../src/host/desenvolvimento.js)).

| URL parameter             | Effect                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `?idioma=ja-JP`           | opens in that language; wins over the browser's                                         |
| `?leve=1`                 | `desempenho.modoLeve()` returns true (otherwise: coarse pointer or `deviceMemory <= 4`) |
| `?convidado=1`            | guest instead of the local account `{ uid: 'local', nome: 'Você' }`                     |
| `?abertura={"nota":"n1"}` | `abertura.atual()` starts with that object                                              |

Notices go to `registro.info`, events to `registro.debug`. Collections persist in `localStorage` under `roqueos:<app>:colecao:<uid>/<nome>`; files and attachments stay in memory. Saving to Files also downloads the file. An app that declares `abre` gets an "Abrir arquivo" input in the bar; full screen stretches the window and Esc leaves it.

## 8. Fake system

`criarSistemaFalso(opcoes)` from `@roqueos-apps/app-sdk/sistema-falso` ([`src/host/falso.js`](../src/host/falso.js)).

| Option               | Default                     | Effect                                                                    |
| -------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `appId`              | `'teste'`                   | the storage and attachment space                                          |
| `idioma`             | `'pt-BR'`                   | normalized with `normalizarIdioma`                                        |
| `identidade`         | `{ uid: null, nome: null }` | guest by default                                                          |
| `modoLeve`           | `false`                     | what `desempenho.modoLeve()` returns                                      |
| `colecoes`           | `[]`                        | the collections in the system's map                                       |
| `abertura`           | `{}`                        | the initial opening request                                               |
| `agora`              | `() => Date.now()`          | the clock for stamps                                                      |
| `pastas`             | `[]`                        | the folders the app declared                                              |
| `telaCheiaPermitida` | `true`                      | whether a full-screen request is granted                                  |
| `bancoDeAnexos`      | a new one                   | share one `criarBancoDeAnexos()` between two fakes to reopen the same app |

It returns `{ sistema, registro, storage, colecoes, mudarIdioma, mudarIdentidade, mudarAbertura, arquivos: { semear, guardados, refs }, anexos: { guardados }, abrirCom, telaCheia: { sair, recusar }, ia: { aberto, contexto, aplicar, fechar }, ouvintesVivos }`. `registro` holds `avisos`, `eventos`, `arquivos`, `paineis`, `pastasAbertas` and `telaCheia`, in order. `ouvintesVivos()` back at zero proves the app released every listener when unmounted.

## 9. Constants and limits

| Constant                             | Value                                                                                    | Where                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| `VERSAO_DO_CONTRATO`                 | `1`                                                                                      | [`src/contrato.js`](../src/contrato.js)   |
| `IDIOMAS`                            | `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `ja-JP`, `zh-CN`, `hi-IN`, `ru-RU`, `ar-AR` | [`src/idiomas.js`](../src/idiomas.js)     |
| `IDIOMA_CANONICO`, `IDIOMA_DE_RECUO` | `pt-BR`, `en-US`                                                                         | [`src/idiomas.js`](../src/idiomas.js)     |
| `TAMANHO_MAXIMO_DE_ANEXO`            | 10 MB (10 485 760 bytes)                                                                 | [`src/anexos.js`](../src/anexos.js)       |
| `MAXIMO_DE_ACOES_DE_IA`              | 6; `rotulo` up to 60 characters, `prompt` up to 2000                                     | [`src/ia.js`](../src/ia.js)               |
| `PASTAS_DE_ARQUIVOS`                 | `Documentos`, `Imagens`, `Videos`                                                        | [`src/arquivos.js`](../src/arquivos.js)   |
| file name                            | up to 200 characters, no `/`, `\` or NUL                                                 | [`src/arquivos.js`](../src/arquivos.js)   |
| document id                          | `^[A-Za-z0-9_-]{1,128}$`; values nested at most 20 levels                                | [`src/colecoes.js`](../src/colecoes.js)   |
| `VARIAVEIS_DO_SISTEMA`               | 13 variables, listed in the source                                                       | [`src/variaveis.js`](../src/variaveis.js) |

## 10. Files and folders

| Path                                       | Who writes    | Who reads                                                    |
| ------------------------------------------ | ------------- | ------------------------------------------------------------ |
| `src/`                                     | contributors  | the package consumers, the tests                             |
| `bin/`                                     | contributors  | gates, CI, the `tag` workflow                                |
| `test/` and `test/fixtures/app-ok/`        | contributors  | `yarn test`; the fixture is a complete valid app             |
| `.github/workflows/`                       | maintainer    | GitHub Actions: `ci.yml` (`verificar`), `dco.yml`, `tag.yml` |
| `CHANGELOG.md`                             | every release | anyone bumping the pin                                       |
| `.nvmrc`                                   | maintainer    | CI (`node-version-file`), nvm                                |
| `.claude/loop.md`, `.claude/settings.json` | maintainer    | the agent maintenance routine and the `roqueos-kit` plugin   |
| `docs/` and `docs/docs.json`               | contributors  | readers, `roqueos-docs`                                      |
