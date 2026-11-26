# Documentação do app-sdk

_[English](../INDEX.md) | Português_

O contrato entre o RoqueOS e um app: o que um app recebe, como ele é conferido e como ele roda sozinho. A versão principal é a em inglês, em [`docs/`](../INDEX.md); cada documento daqui é o par dela.

Por onde começar depende do que você quer.

| Quero...                                                     | Leia                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Deixar o gate verde e um app montado**                     | [COMECAR.md](COMECAR.md): do clone ao primeiro teste de app                               |
| **Ver como ele é por dentro**                                | [ARQUITETURA.md](ARQUITETURA.md): contexto, componentes, fluxos, dados, decisões, limites |
| **Consultar um export, capacidade, código de erro ou campo** | [REFERENCIA.md](REFERENCIA.md)                                                            |
| **Cortar uma release ou mudar o contrato sem susto**         | [OPERACAO.md](OPERACAO.md): rotina, release, versão, desfazer, acompanhar                 |
| **Entender uma falha**                                       | [QUANDO-QUEBRA.md](QUANDO-QUEBRA.md): sintoma, causa, o que fazer                         |
| **Achar um termo**                                           | [GLOSSARIO.md](GLOSSARIO.md)                                                              |
| **Acrescentar uma capacidade ou uma regra do app check**     | [ESTENDER.md](ESTENDER.md)                                                                |
| **Ligar um app, um sistema ou um harness**                   | [INTEGRACOES.md](INTEGRACOES.md)                                                          |
| **Saber o que se protege e o que não**                       | [MODELO-DE-AMEACAS.md](MODELO-DE-AMEACAS.md)                                              |
| **Saber o que cada teste prova**                             | [TESTES.md](TESTES.md)                                                                    |
| **Contribuir**                                               | [CONTRIBUTING.md](CONTRIBUTING.md)                                                        |
| **Reportar uma vulnerabilidade**                             | [../../SECURITY.md](../../SECURITY.md)                                                    |
| **Ver o que mudou**                                          | [../../CHANGELOG.md](../../CHANGELOG.md)                                                  |

## Diagramas

| Diagrama                           | Fonte                                                    | Explicado em                                                                   |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| contexto: os três sistemas e o app | mermaid no ARQUITETURA.md                                | [ARQUITETURA.md, seção 2](ARQUITETURA.md#2-contexto-quem-usa-e-do-que-depende) |
| montar um app                      | mermaid no ARQUITETURA.md                                | [ARQUITETURA.md, seção 5.1](ARQUITETURA.md#51-montar-um-app)                   |
| o app check num repo de app        | mermaid no ARQUITETURA.md                                | [ARQUITETURA.md, seção 5.2](ARQUITETURA.md#52-o-app-check-num-repo-de-app)     |
| o "abrir com" do Finder            | mermaid no ARQUITETURA.md                                | [ARQUITETURA.md, seção 5.3](ARQUITETURA.md#53-o-abrir-com-do-finder)           |
| cortar uma release                 | mermaid no ARQUITETURA.md                                | [ARQUITETURA.md, seção 5.4](ARQUITETURA.md#54-cortar-uma-release)              |
| a figura do README                 | [`contrato.svg`](../contrato.svg), estática, sem gerador | [ARQUITETURA.md, seção 9](ARQUITETURA.md#9-limites-conhecidos)                 |
