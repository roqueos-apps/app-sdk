# Referência

_[English](../REFERENCE.md) | Português_

> **Para quem:** quem precisa do nome, da forma ou do código exato de alguma coisa enquanto escreve um app, um sistema ou uma mudança no SDK.
> **O que tem aqui:** comandos e scripts, as portas de entrada e os exports do pacote, cada capacidade com a forma dela, os códigos de erro, cada campo do `app.json`, as seções do `app check`, as opções do sistema de desenvolvimento e do falso, e os arquivos do repositório.
> **Onde ir para o resto:** por que cada peça é como é, em [ARQUITETURA.md](ARQUITETURA.md); como acrescentar uma, em [ESTENDER.md](ESTENDER.md).

Os nomes no código são em português, como no fonte.

## Sumário

1. [Comandos e scripts](#1-comandos-e-scripts)
2. [Capacidades](#2-capacidades)
3. [Códigos de erro](#3-códigos-de-erro)
4. [Portas de entrada e exports do pacote](#4-portas-de-entrada-e-exports-do-pacote)
5. [O manifesto `app.json`](#5-o-manifesto-appjson)
6. [As seções do `app check`](#6-as-seções-do-app-check)
7. [Sistema de desenvolvimento](#7-sistema-de-desenvolvimento)
8. [Sistema falso](#8-sistema-falso)
9. [Constantes e limites](#9-constantes-e-limites)
10. [Arquivos e pastas](#10-arquivos-e-pastas)

## 1. Comandos e scripts

| Comando                                             | O que faz                                                                                               | Códigos de saída                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `yarn install --ignore-scripts`                     | instala as dependências de desenvolvimento (o CI usa também `--frozen-lockfile`)                        | os do yarn                                                                          |
| `yarn verificar`                                    | `yarn lint && yarn format:check && yarn test && yarn app:check`; o gate, o mesmo no CI e no pre-push    | 0 verde, diferente de 0 no primeiro passo que falha                                 |
| `yarn test`                                         | `node --test test/*.test.js`                                                                            | 0 tudo passa, 1 qualquer falha                                                      |
| `yarn lint`                                         | `eslint .` com o [`eslint.config.js`](../../eslint.config.js)                                           | 0 limpo, 1 problemas                                                                |
| `yarn format:check` / `yarn format`                 | `prettier --check .` / `prettier --write .` com o [`.prettierrc`](../../.prettierrc), Markdown incluído | 0 limpo, 1 arquivos a formatar                                                      |
| `yarn app:check`                                    | `node bin/app.mjs check --sdk`: só a seção dos scripts de instalação                                    | 0 ok, 1 problema                                                                    |
| `node bin/app.mjs check [pasta] [--sdk] [--json]`   | o `app check` num repo de app (o diretório atual por padrão)                                            | 0 ok, 1 qualquer problema, 2 uso errado (`uso: app check [pasta] [--sdk] [--json]`) |
| `node bin/tag-na-main.mjs <commit> [<ref da main>]` | o commit é ancestral da `main` (padrão `origin/main`)?                                                  | 0 sim, 1 não, 2 faltou argumento ou o git não achou o commit                        |

## 2. Capacidades

Todas em [`src/contrato.js`](../../src/contrato.js). As seis obrigatórias todo sistema tem; as opcionais o app lista em `capacidades` no `app.json`, e o `mount` recusa o sistema que não as tem.

| Capacidade      | Obrigatória | Forma                                                                                                                                  | Para quê                                                                                                                                                | Desde |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `identidade`    | sim         | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | `{ uid, nome }`, ou `{ uid: null, nome: null }` para convidado                                                                                          | 0.1.0 |
| `avisar`        | sim         | `avisar(mensagem, { tipo, fixo, titulo })`                                                                                             | o que a pessoa precisa ler; `tipo` é `info`, `sucesso`, `aviso` ou `erro`; `fixo: true` fica até ela fechar; `titulo` desde 0.2.0                       | 0.1.0 |
| `idioma`        | sim         | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | um dos dez idiomas; a troca chega com a janela aberta                                                                                                   | 0.1.0 |
| `desempenho`    | sim         | `modoLeve()`                                                                                                                           | o aparelho pede o perfil leve                                                                                                                           | 0.1.0 |
| `metricas`      | sim         | `evento(nome, dados)`                                                                                                                  | uso, com nomes de evento que não mudam sem motivo                                                                                                       | 0.1.0 |
| `armazenamento` | sim         | `ler(chave)`, `gravar(chave, valor)`, `apagar(chave)`                                                                                  | texto no espaço `roqueos:<app>:<chave>`, no aparelho; falha vira `null` ou `false`, nunca exceção                                                       | 0.1.0 |
| `colecoes`      | não         | `abrir(nome)` → `{ observar(fn, aoErrar), ler(id), criar(id, campos), atualizar(id, campos), apagar(id) }`                             | documentos na conta da pessoa, em tempo real, em todo aparelho; `ler(id)` desde 0.3.0 ([`src/colecoes.js`](../../src/colecoes.js))                      | 0.2.0 |
| `ia`            | não         | `abrirPainel({ ancora, tipo, contexto, aplicar, acento, titulo, aoFechar, acoes })` → `{ fechar }`                                     | o painel de IA do sistema sobre o conteúdo do app; `tipo` é `text`, `code` ou `read`; `acoes` desde 0.3.0 ([`src/ia.js`](../../src/ia.js))              | 0.2.0 |
| `arquivos`      | não         | `salvar({ nome, conteudo, tipo, pasta })` → `{ nome, pasta, ref }`, `listar(pasta, { tipos })`, `ler(ref)` → Blob, `abrirPasta(pasta)` | os Arquivos da pessoa por pasta e ref opaca; `listar`, `ler` e `abrirPasta` desde 0.3.0 ([`src/arquivos.js`](../../src/arquivos.js))                    | 0.2.0 |
| `abertura`      | não         | `atual()`, `aoMudar(fn)` → `parar()`                                                                                                   | o que quem abriu mandou; o "abrir com" do Finder chega como `{ arquivo: { ref, nome, tipo } }` desde 0.3.0 ([`src/abertura.js`](../../src/abertura.js)) | 0.2.0 |
| `anexos`        | não         | `guardar(blob)` → `{ id }`, `ler(id)` → Blob, `apagar(id)`                                                                             | bytes do app na conta, por um id durável que nunca vira URL ([`src/anexos.js`](../../src/anexos.js))                                                    | 0.3.0 |
| `janela`        | não         | `telaCheia(bool)` → estado, `emTelaCheia()`, `aoMudarTelaCheia(fn)` → `parar()`                                                        | a tela cheia feita pelo sistema ([`src/janela.js`](../../src/janela.js))                                                                                | 0.3.0 |

## 3. Códigos de erro

A capacidade opcional que falha rejeita com `ErroDoSistema`, que tem `name: 'ErroDoSistema'` e um `codigo` desta lista ([`src/erros.js`](../../src/erros.js)). Código fora da lista lança `TypeError` no construtor. As descrições são as do fonte.

| `codigo`               | O que quer dizer (literal, do fonte)                                                                        |
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

## 4. Portas de entrada e exports do pacote

| Porta de entrada (`exports` no [`package.json`](../../package.json)) | Arquivo                                                            | Exporta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@roqueos-apps/app-sdk`                                              | [`src/index.js`](../../src/index.js)                               | `definirApp`; `VERSAO_DO_CONTRATO`, `CAPACIDADES`, `OBRIGATORIAS`, `OPCIONAIS`, `TIPOS_DE_AVISO`, `verificarSistema`; `IDIOMAS`, `IDIOMA_CANONICO`, `IDIOMA_DE_RECUO`, `normalizarIdioma`; `emModoE2E`, `estadoE2E`; `validarManifesto`, `CATEGORIAS`, `CAMADAS`; `VARIAVEIS_DO_SISTEMA`; `ErroDoSistema`, `CODIGOS_DE_ERRO`; `CARIMBOS`, `conferirCampos`, `conferirIdDeDocumento`; `PASTAS_DE_ARQUIVOS`, `conferirArquivo`, `conferirPasta`, `conferirPastaDeclarada`, `conferirTipos`, `criarCofreDeRefs`, `ehPadraoDeTipo`, `entradaDeArquivo`, `ordenarArquivos`, `tipoCasa`; `MAXIMO_DE_ACOES_DE_IA`, `TIPOS_DE_IA`, `conferirPedidoDeIa`; `criarAbertura`; `criarTelaCheia`; `TAMANHO_MAXIMO_DE_ANEXO`, `conferirConteudoDeAnexo`, `conferirIdDeAnexo`, `gerarIdDeAnexo` |
| `@roqueos-apps/app-sdk/sistema-de-desenvolvimento`                   | [`src/host/desenvolvimento.js`](../../src/host/desenvolvimento.js) | `criarSistemaDeDesenvolvimento`, `montarNaJanelaFalsa`, `CONTA_DE_DESENVOLVIMENTO`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@roqueos-apps/app-sdk/sistema-falso`                                | [`src/host/falso.js`](../../src/host/falso.js)                     | `criarSistemaFalso`, `criarBancoDeAnexos`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `@roqueos-apps/app-sdk/armazenamento`                                | [`src/host/armazenamento.js`](../../src/host/armazenamento.js)     | `chaveDoApp`, `armazenamentoDoApp`, `armazenamentoEmMemoria`, `storageDoNavegador`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@roqueos-apps/app-sdk/verificacao`                                  | [`src/verificacao.js`](../../src/verificacao.js)                   | `verificarRepo` e cada seção (`conferirScriptsDeInstalacao`, `conferirManifesto`, `conferirTextos`, `conferirAssets`, `conferirBanco`, `conferirImportsDoRoqueOS`, `conferirVariaveis`, `conferirCapacidadesDeclaradas`, `conferirPastasDeclaradas`), e mais `SCRIPTS_DE_INSTALACAO`, `LICENCAS_DE_ASSET`, `APELIDOS_DO_ROQUEOS`, `chavesFolha`, `semComentarios`, `ehFirebase`, `ehDoRoqueOS`                                                                                                                                                                                                                                                                                                                                                                                  |
| `app` (bin)                                                          | [`bin/app.mjs`](../../bin/app.mjs)                                 | o CLI do `app check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

`definirApp({ id, capacidades = [], montar })` lança `TypeError` para id fora de `^[a-z][a-z0-9]*$`, `montar` ausente ou `capacidades` que não é lista. Devolve um `{ id, versaoDoContrato, capacidades, mount(el, sistema, { windowId, ativo }) }` congelado. O `montar` recebe `{ windowId: windowId ?? null, ativo: ativo ?? true }` e precisa devolver `{ ativar?, desmontar }`.

## 5. O manifesto `app.json`

Conferido por `validarManifesto` ([`src/manifesto.js`](../../src/manifesto.js)), que devolve todos os problemas de uma vez. Campo fora desta tabela reprova.

| Campo              | Obrigatório                             | Formato                                                                                                                                                                 |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | sim                                     | `^[a-z][a-z0-9]*$`; permanente: chave da janela, do dock, do armazenamento e das preferências                                                                           |
| `versaoDoContrato` | sim                                     | `1`                                                                                                                                                                     |
| `camada`           | sim                                     | `primeira-parte` ou `comunidade`                                                                                                                                        |
| `nome`             | sim                                     | um texto por idioma: os dez para primeira parte, pelo menos `pt-BR` e `en-US` para comunidade; nenhum outro idioma, nenhum texto vazio                                  |
| `descricao`        | sim                                     | igual a `nome`                                                                                                                                                          |
| `icone`            | sim                                     | nome de Material Icon (`^[a-z0-9_]+$`) ou caminho de um SVG no repo, que precisa existir                                                                                |
| `cor`              | sim                                     | `#rrggbb`                                                                                                                                                               |
| `categoria`        | sim                                     | `productivity`, `creativity`, `media`, `utilities`, `entertainment`, `social` ou `development` (`system` fica de fora de propósito)                                     |
| `janela`           | sim                                     | `{ largura, altura, minLargura, minAltura }` inteiros positivos em pixels, o mínimo sem passar do tamanho inicial; `maximizavel` booleano, opcional; nenhum outro campo |
| `naLoja`           | não                                     | booleano                                                                                                                                                                |
| `capacidades`      | não                                     | lista só das opcionais; obrigatória listada é erro que se explica                                                                                                       |
| `colecoes`         | com `colecoes` em `capacidades`         | lista não vazia de nomes `^[a-z][a-zA-Z0-9]*$`, sem repetir                                                                                                             |
| `pastas`           | não, precisa de `arquivos`              | lista não vazia de `Documentos`, `Imagens`, `Videos`, sem repetir: as pastas que o app lista e mostra                                                                   |
| `abre`             | não, precisa de `abertura` e `arquivos` | lista não vazia de padrões de tipo (`image/*`, `application/pdf`), sem repetir                                                                                          |
| `autor`            | sim                                     | texto não vazio                                                                                                                                                         |
| `licenca`          | sim                                     | texto não vazio, o identificador SPDX                                                                                                                                   |

## 6. As seções do `app check`

`verificarRepo(raiz, { sdk, semPackage })` em [`src/verificacao.js`](../../src/verificacao.js). Com `sdk`, só a primeira seção roda; com `semPackage` (app que ainda mora no RoqueOS), a primeira fica de fora. Os nomes das seções saem impressos como aparecem aqui.

| Seção (literal)                    | Reprova quando                                                                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts de instalação`            | falta o `package.json`, ou ele declara `preinstall`, `install`, `postinstall`, `prepare`, `prepack` ou `postpack`                                                                                                                                                        |
| `manifesto`                        | falta o `app.json`, ele não é JSON, não passa no `validarManifesto`, ou o `icone` aponta para um SVG que não existe                                                                                                                                                      |
| `textos nos idiomas`               | falta `i18n/` ou `i18n/pt-BR.json`; falta um idioma obrigatório; uma chave falta, sobra ou está vazia contra o `pt-BR`; há arquivo de um idioma que a casa não fala                                                                                                      |
| `origem dos assets`                | um arquivo de `public/` não tem linha no `ASSETS.md` (caminho, licença, origem), tem licença fora de `CC0-1.0`, `CC-BY-4.0`, `MIT`, `BSD-3-Clause`, `autoral` (pacote `UNLICENSED` aceita qualquer licença declarada, mas não `?` nem `desconhecida`), ou não tem origem |
| `o app não fala com banco`         | o `src/` importa `firebase`, `firebase/*` ou `@firebase/*`                                                                                                                                                                                                               |
| `o app não importa o RoqueOS`      | o `src/` importa `quasar` ou um apelido do RoqueOS (`src/`, `app/`, `boot/`, `stores/`, `components/`, `layouts/`, `pages/`, `assets/`, `css/`, com ou sem `~`) no JS, no `.vue` ou no estilo                                                                            |
| `variáveis do sistema no contrato` | o `src/` lê um `var(--ros-*)` fora de `VARIAVEIS_DO_SISTEMA`, ou declara qualquer `--ros-*` no CSS ou no JavaScript                                                                                                                                                      |
| `capacidades opcionais declaradas` | o `src/` usa `sistema.x`, `sistema?.x`, `sistema['x']` ou `{ x } = sistema` para uma opcional fora de `capacidades`                                                                                                                                                      |
| `pastas declaradas`                | o `src/` chama `listar('X')` ou `abrirPasta('X')` com uma pasta literal fora de `pastas`                                                                                                                                                                                 |

Os comentários saem antes de ler imports e variáveis (`semComentarios`), então import comentado não conta.

## 7. Sistema de desenvolvimento

`montarNaJanelaFalsa(app, { manifesto, alvo, janela, registro })` monta o app numa janela falsa do RoqueOS com o tamanho de `manifesto.janela` (padrão 480 por 640), o nome no idioma atual e um seletor dos dez idiomas, e devolve `{ sistema, montagem, mudarIdioma }`. `criarSistemaDeDesenvolvimento({ appId, janela, registro, idioma, colecoes, pastas, aoTelaCheia })` é o sistema sozinho ([`src/host/desenvolvimento.js`](../../src/host/desenvolvimento.js)).

| Parâmetro na URL          | Efeito                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `?idioma=ja-JP`           | abre naquele idioma; vence o do navegador                                                  |
| `?leve=1`                 | `desempenho.modoLeve()` devolve verdadeiro (senão: ponteiro grosso ou `deviceMemory <= 4`) |
| `?convidado=1`            | convidado em vez da conta local `{ uid: 'local', nome: 'Você' }`                           |
| `?abertura={"nota":"n1"}` | `abertura.atual()` começa com esse objeto                                                  |

Os avisos vão para `registro.info`, os eventos para `registro.debug`. As coleções ficam no `localStorage` em `roqueos:<app>:colecao:<uid>/<nome>`; arquivos e anexos ficam em memória. Salvar em Arquivos também baixa o arquivo. O app que declara `abre` ganha um campo "Abrir arquivo" na barra; a tela cheia estica a janela, e Esc sai.

## 8. Sistema falso

`criarSistemaFalso(opcoes)` de `@roqueos-apps/app-sdk/sistema-falso` ([`src/host/falso.js`](../../src/host/falso.js)).

| Opção                | Padrão                      | Efeito                                                                      |
| -------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `appId`              | `'teste'`                   | o espaço do armazenamento e dos anexos                                      |
| `idioma`             | `'pt-BR'`                   | normalizado com `normalizarIdioma`                                          |
| `identidade`         | `{ uid: null, nome: null }` | convidado por padrão                                                        |
| `modoLeve`           | `false`                     | o que `desempenho.modoLeve()` devolve                                       |
| `colecoes`           | `[]`                        | as coleções no mapa do sistema                                              |
| `abertura`           | `{}`                        | o pedido de abertura inicial                                                |
| `agora`              | `() => Date.now()`          | o relógio dos carimbos                                                      |
| `pastas`             | `[]`                        | as pastas que o app declarou                                                |
| `telaCheiaPermitida` | `true`                      | se o pedido de tela cheia é atendido                                        |
| `bancoDeAnexos`      | um novo                     | divida um `criarBancoDeAnexos()` entre dois falsos para reabrir o mesmo app |

Devolve `{ sistema, registro, storage, colecoes, mudarIdioma, mudarIdentidade, mudarAbertura, arquivos: { semear, guardados, refs }, anexos: { guardados }, abrirCom, telaCheia: { sair, recusar }, ia: { aberto, contexto, aplicar, fechar }, ouvintesVivos }`. O `registro` guarda `avisos`, `eventos`, `arquivos`, `paineis`, `pastasAbertas` e `telaCheia`, na ordem. `ouvintesVivos()` de volta a zero prova que o app soltou todo ouvinte ao desmontar.

## 9. Constantes e limites

| Constante                            | Valor                                                                                    | Onde                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| `VERSAO_DO_CONTRATO`                 | `1`                                                                                      | [`src/contrato.js`](../../src/contrato.js)   |
| `IDIOMAS`                            | `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `ja-JP`, `zh-CN`, `hi-IN`, `ru-RU`, `ar-AR` | [`src/idiomas.js`](../../src/idiomas.js)     |
| `IDIOMA_CANONICO`, `IDIOMA_DE_RECUO` | `pt-BR`, `en-US`                                                                         | [`src/idiomas.js`](../../src/idiomas.js)     |
| `TAMANHO_MAXIMO_DE_ANEXO`            | 10 MB (10 485 760 bytes)                                                                 | [`src/anexos.js`](../../src/anexos.js)       |
| `MAXIMO_DE_ACOES_DE_IA`              | 6; `rotulo` até 60 caracteres, `prompt` até 2000                                         | [`src/ia.js`](../../src/ia.js)               |
| `PASTAS_DE_ARQUIVOS`                 | `Documentos`, `Imagens`, `Videos`                                                        | [`src/arquivos.js`](../../src/arquivos.js)   |
| nome de arquivo                      | até 200 caracteres, sem `/`, `\` nem NUL                                                 | [`src/arquivos.js`](../../src/arquivos.js)   |
| id de documento                      | `^[A-Za-z0-9_-]{1,128}$`; valores aninhados até 20 níveis                                | [`src/colecoes.js`](../../src/colecoes.js)   |
| `VARIAVEIS_DO_SISTEMA`               | 13 variáveis, listadas no fonte                                                          | [`src/variaveis.js`](../../src/variaveis.js) |

## 10. Arquivos e pastas

| Caminho                                    | Quem escreve   | Quem lê                                                        |
| ------------------------------------------ | -------------- | -------------------------------------------------------------- |
| `src/`                                     | quem contribui | quem consome o pacote, os testes                               |
| `bin/`                                     | quem contribui | gates, CI, o workflow `tag`                                    |
| `test/` e `test/fixtures/app-ok/`          | quem contribui | `yarn test`; o fixture é um app válido completo                |
| `.github/workflows/`                       | o mantenedor   | o GitHub Actions: `ci.yml` (`verificar`), `dco.yml`, `tag.yml` |
| `CHANGELOG.md`                             | toda release   | quem sobe o pin                                                |
| `.nvmrc`                                   | o mantenedor   | o CI (`node-version-file`), o nvm                              |
| `.claude/loop.md`, `.claude/settings.json` | o mantenedor   | a rotina de manutenção do agente e o plugin `roqueos-kit`      |
| `docs/` e `docs/docs.json`                 | quem contribui | quem lê, o `roqueos-docs`                                      |
