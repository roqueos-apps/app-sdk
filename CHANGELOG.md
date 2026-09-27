# Changelog

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto
usa [versionamento semântico](https://semver.org/lang/pt-BR/) sobre o contrato: capacidade
nova e opcional é versão menor; mudar a forma de uma capacidade é versão nova do contrato.

## [0.1.0] - 2026-09-27

### Adicionado

- `definirApp({ id, capacidades, montar })` e o `mount(el, sistema, { windowId, ativo })`, que
  confere o sistema antes de montar e recusa com a lista inteira do que falta.
- Contrato v1 com cinco capacidades obrigatórias, as mesmas que o `jogo-sdk` prova em vinte
  jogos: `identidade`, `avisar`, `idioma`, `metricas` e `armazenamento`.
- `validarManifesto` para o `app.json`: id permanente, camada (`primeira-parte` ou
  `comunidade`), nome e descrição nos idiomas da camada, ícone, cor, categoria (sem `system`),
  janela, capacidades, autor e licença. Campo desconhecido reprova.
- `VARIAVEIS_DO_SISTEMA`: as três variáveis CSS do tema do RoqueOS que um app pode usar
  (`--ros-white-rgb`, `--ros-black-rgb`, `--ros-border-dim`).
- Sistema de desenvolvimento com `montarNaJanelaFalsa` (tamanho do manifesto, nome no idioma,
  seletor dos dez idiomas, árabe em RTL, `?idioma=` na URL) e sistema falso para teste.
- `app check`: scripts de instalação, manifesto, textos nos idiomas, origem dos assets, sem
  Firebase, sem import de dentro do RoqueOS (JavaScript, `.vue` e SCSS, e o Quasar), e só as
  variáveis `--ros-*` do contrato, sem declarar nenhuma.
