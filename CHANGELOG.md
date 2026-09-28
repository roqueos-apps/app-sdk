# Changelog

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto
usa [versionamento semântico](https://semver.org/lang/pt-BR/) sobre o contrato: capacidade
nova e opcional é versão menor, e acrescentar função a uma opcional também; tirar função ou
mudar a forma ou o sentido de uma capacidade é versão nova do contrato.

## [0.3.0] - sem data até o PR #4 entrar na `main`

O que a Lousa, a Câmera, a Captura de tela, os visualizadores e o Letreiro precisam para sair do
RoqueOS. O contrato continua o 1: um app 0.2.0 monta igual. A tag só sai depois que a 0.2.0
entrar na `main` (sem squash) e esta versão for rebaseada sobre ela.

### Adicionado

- `arquivos`: `listar(pasta, { tipos })` devolve `[{ ref, nome, tipo, tamanho, modificadoEm }]`,
  os mais novos primeiro; `ler(ref)` devolve o Blob; `abrirPasta(pasta)` mostra a pasta no
  Finder. As pastas `Imagens` e `Videos` entram na lista (identificadores sem acento; o nome
  que a pessoa vê é do sistema). Listar e abrir só a pasta declarada em `pastas` no app.json
  (`pasta-nao-declarada`); salvar continua livre em qualquer pasta da lista.
- A ref de arquivo é opaca: presa ao app e à sessão, sem caminho nem nome no texto. Ref
  fabricada, de outro app ou guardada de ontem rejeita com `ref-invalida`. `criarCofreDeRefs`
  é o cofre que os três sistemas usam.
- `salvar` devolve também `ref`, que lê o que acabou de ser salvo.
- `abertura`: o "abrir com" do Finder chega como `{ arquivo: { ref, nome, tipo } }` ao app que
  declara o tipo em `abre` no app.json, e esse arquivo o app lê mesmo sem ter declarado a
  pasta dele.
- `colecoes.abrir(nome).ler(id)`: um documento só, sem assinar a coleção (null quando não
  existe ou sem conta). Para documento grande que se abre um de cada vez, como o quadro da Lousa.
- `anexos`, opcional nova: `guardar(blob)` devolve `{ id }`, `ler(id)` devolve o Blob e
  `apagar(id)` tira. Bytes do app na conta da pessoa (a imagem colada no quadro da Lousa), por
  um id que dura entre sessões e aparelhos e que é do app e da conta. Nunca há URL durável no
  contrato. Sem conta rejeita; acima de 10 MB (`TAMANHO_MAXIMO_DE_ANEXO`), `grande-demais`.
  `gerarIdDeAnexo`, `conferirIdDeAnexo` e `conferirConteudoDeAnexo` para os três sistemas.
- `ia.abrirPainel` aceita `acoes`: até seis ações do app somadas às do catálogo do tipo,
  `{ id, rotulo, prompt, icone }`, com o rótulo já no idioma de quem usa. A Lousa agrupa um
  brainstorm em temas e tira dele as ações a fazer; sem isto, perderia as duas ao sair do
  RoqueOS. `MAXIMO_DE_ACOES_DE_IA`.
- `janela`, opcional nova: `telaCheia(true | false)` resolve com o estado real,
  `emTelaCheia()` e `aoMudarTelaCheia(fn)`. É o sistema quem faz a tela cheia, porque no RoqueOS
  ela escreve no `<html>`, o que um app não pode.
- `app.json` ganha `pastas` (com `arquivos`) e `abre` (padrões de tipo como `image/*`, com
  `abertura` e `arquivos`).
- `app check` reprova `listar('X')` ou `abrirPasta('X')` no `src/` sem `X` em `pastas`.
- Códigos de erro `pasta-nao-declarada`, `ref-invalida`, `nao-encontrado` e `grande-demais`.
- Sistema falso com `bancoDeAnexos` (`criarBancoDeAnexos`, para o mesmo app reaberto) e
  `anexos.guardados()`.
- Sistema falso com `pastas` e `telaCheiaPermitida`, `registro.pastasAbertas` e
  `registro.telaCheia`, `arquivos.semear`/`arquivos.guardados`, `abrirCom` e
  `telaCheia.sair`/`telaCheia.recusar`.
- Sistema de desenvolvimento: o que a sessão salvou aparece no `listar`; o app com `abre` ganha
  um "Abrir arquivo" na barra da janela falsa; a tela cheia estica a janela, e Esc sai.
- `bin/tag-na-main.mjs` e o workflow `tag`: tag de release só em commit que já está na `main`.
  A v0.2.0 reprova nele (está no commit do PR #4), e é por isso que a regra existe.

### Mudado

- O texto do contrato diz que acrescentar função a uma opcional é versão menor.

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
- `VARIAVEIS_DO_SISTEMA` ganha as bases que um tema do RoqueOS redefine, para o kit de
  interface (`@roqueos-apps/ui`) acompanhar o tema: `--ros-text-rgb`, `--ros-fill-rgb`,
  `--ros-line-rgb`, `--ros-scrim-rgb`, `--ros-shadow-rgb`, `--ros-surface-0-rgb` e
  `--ros-danger-rgb`.
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
