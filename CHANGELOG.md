# Changelog

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto
usa [versionamento semântico](https://semver.org/lang/pt-BR/) sobre o contrato: capacidade
nova e opcional é versão menor; mudar a forma de uma capacidade é versão nova do contrato.

## [0.2.0] - 2026-09-27

As quatro capacidades opcionais que as Notas precisam para sair do RoqueOS. O contrato
continua o 1: um app 0.1.0 monta igual.

### Adicionado

- `colecoes`: `abrir(nome)` com `observar`, `criar`, `atualizar` e `apagar` sobre documentos
  na conta da pessoa. O sistema carimba `criadoEm` e `atualizadoEm` em milissegundos e recusa
  o app que tenta gravar um deles; `atualizar` troca só os campos enviados, para dois donos
  escreverem no mesmo documento sem um apagar o outro; a lista segue a conta, e sem conta
  gravar rejeita. Só abre a coleção que está no mapa do sistema.
- `ia`: `abrirPainel({ ancora, tipo, contexto, aplicar, acento, titulo, aoFechar })` abre o
  painel de IA do sistema dentro de um elemento do app. Um painel por janela; o sistema fecha
  sozinho quando a janela desmonta.
- `arquivos`: `salvar({ nome, conteudo, tipo, pasta })` guarda nos Arquivos da pessoa, numa
  pasta da lista (`Documentos`), sem sobrescrever.
- `abertura`: `atual()` e `aoMudar(fn)`, o que quem abriu a janela mandou e o pedido novo
  com ela aberta.
- `avisar` aceita `titulo`.
- `ErroDoSistema` com `codigo`, que toda opcional devolve quando falha, em vez de fingir.
- `app.json` ganha `colecoes`, os nomes das coleções que o app abre (obrigatório com a
  capacidade `colecoes`), para o RoqueOS conferir o mapa no build.
- `app check` reprova a opcional usada no `src/` sem estar em `capacidades`.
- Sistema falso com as quatro, e com `mudarAbertura`, `colecoes.semear`,
  `colecoes.guardado`, `ia.aplicar` e `ia.fechar` para o teste do app.

### Mudado

- O sistema de desenvolvimento entra numa conta local (`?convidado=1` volta ao convidado),
  guarda as coleções no `localStorage` do app, mostra onde o painel de IA abriria, transforma
  salvar em Arquivos em download e lê `?abertura=` da URL.

## [0.1.0] - 2026-09-27

### Adicionado

- `definirApp({ id, capacidades, montar })` e o `mount(el, sistema, { windowId, ativo })`, que
  confere o sistema antes de montar e recusa com a lista inteira do que falta.
- Contrato v1 com seis capacidades obrigatórias, vindas do `jogo-sdk`, que as prova em vinte
  jogos: `identidade`, `avisar`, `idioma`, `desempenho`, `metricas` e `armazenamento`.
- `validarManifesto` para o `app.json`: id permanente, camada (`primeira-parte` ou
  `comunidade`), nome e descrição nos idiomas da camada, ícone, cor, categoria (sem `system`),
  janela, capacidades, autor e licença. Campo desconhecido reprova.
- `VARIAVEIS_DO_SISTEMA`: as seis variáveis CSS do tema do RoqueOS que um app pode usar, as
  que a Calculadora usa (`--ros-white-rgb`, `--ros-black-rgb`, `--ros-border-dim`,
  `--ros-text-100`, `--ros-shadow-30`, `--ros-shadow-50`).
- Sistema de desenvolvimento com `montarNaJanelaFalsa` (tamanho do manifesto, nome no idioma,
  seletor dos dez idiomas, árabe em RTL, `?idioma=` na URL) e sistema falso para teste.
- `app check`: scripts de instalação, manifesto, textos nos idiomas, origem dos assets, sem
  Firebase, sem import de dentro do RoqueOS (JavaScript, `.vue` e SCSS, e o Quasar), e só as
  variáveis `--ros-*` do contrato, sem declarar nenhuma.
