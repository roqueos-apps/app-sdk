# Operação

_[English](../OPERATIONS.md) | Português_

> **Para quem:** o mantenedor, e o agente que roda a rotina de manutenção.
> **O que tem aqui:** a rotina, como cortar uma release, como mudar o contrato sem quebrar a família, como os consumidores passam para uma tag nova, como desfazer cada passo irreversível, backup e o que acompanhar.
> **Onde ir para o resto:** o que cada falha quer dizer está em [QUANDO-QUEBRA.md](QUANDO-QUEBRA.md); os comandos, em [REFERENCIA.md](REFERENCIA.md#1-comandos-e-scripts).

## Sumário

1. [A rotina](#1-a-rotina)
2. [Cortar uma release](#2-cortar-uma-release)
3. [Mudar o contrato sem quebrar](#3-mudar-o-contrato-sem-quebrar)
4. [Passar os consumidores para uma tag nova](#4-passar-os-consumidores-para-uma-tag-nova)
5. [Desfazer](#5-desfazer)
6. [Backup e restauração](#6-backup-e-restauração)
7. [O que acompanhar](#7-o-que-acompanhar)

## 1. A rotina

Não há horário nem nada rodando: o SDK não tem servidor. A rotina é a do [`.claude/loop.md`](../../.claude/loop.md), uma coisa por iteração, parando na primeira que tiver trabalho, com a evidência colada no chat:

1. Gate vermelho: `yarn verificar` (pelo `roqueos-gate` quando o kit está instalado).
2. CI do GitHub vermelho: `gh run list --limit 3`. Vermelho lá e verde aqui é ambiente divergente, e se investiga antes de qualquer outra coisa.
3. PR sem `Signed-off-by`: quem contribui recebe o comando que conserta, `git rebase --signoff main`.
4. Issue ou PR de fora sem resposta: `gh issue list` e `gh pr list`.
5. Asset sem origem (nos repos de app, onde existe `public/`).
6. SDK atrás (nos repos de app): tag nova do SDK com capacidade que o app usa vira bump.
7. Drift de docs: README, CONTRIBUTING e os documentos daqui dizem o mesmo que o código.

## 2. Cortar uma release

O repositório não tem script de release. Uma release é a versão no [`package.json`](../../package.json), uma entrada no [`CHANGELOG.md`](../../CHANGELOG.md) e uma tag `vX.Y.Z` num commit da `main`:

```bash
# no branch da release: a versão no package.json e a entrada do CHANGELOG, depois o gate
yarn verificar
git commit -s -m "<versão e o que ela traz>"
# abra o PR; faça o merge na main SEM squash, para o próprio commit entrar na main
git switch main && git pull
git tag v0.4.0 <commit da main>
git push origin v0.4.0
gh run list --workflow tag --limit 1     # tem de estar verde
```

O workflow `tag` ([`.github/workflows/tag.yml`](../../.github/workflows/tag.yml)) roda `node bin/tag-na-main.mjs "$GITHUB_SHA" origin/main` em toda tag `v*` e fica vermelho quando o commit da tag não está na `main`. A 0.2.0 e a 0.3.0 entraram na `main` por merge sem squash, e é por isso que os commits das tags delas estão lá ([CHANGELOG.md](../../CHANGELOG.md)). O número `0.4.0` acima é um exemplo.

## 3. Mudar o contrato sem quebrar

O versionamento é semântico sobre o contrato ([CHANGELOG.md](../../CHANGELOG.md), [`src/contrato.js`](../../src/contrato.js)):

| Mudança                                          | Versão                               | Por quê                                                                                                    |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| capacidade opcional nova                         | menor                                | o app de antes continua servido                                                                            |
| função acrescentada a uma opcional               | menor                                | o app de antes continua servido; o sistema sem a função recusa, com o motivo, o app que exige a capacidade |
| variável CSS nova em `VARIAVEIS_DO_SISTEMA`      | menor                                | nada que funcionava para                                                                                   |
| função tirada, ou forma ou sentido de uma mudado | contrato novo (`VERSAO_DO_CONTRATO`) | o sistema recusa o app que pede outra versão em vez de quebrar em runtime                                  |
| variável CSS tirada                              | quebra                               | o contrato do tema com o RoqueOS ([CLAUDE.md](../../CLAUDE.md))                                            |

A ordem entre os repos é fixa: o SDK muda primeiro, o sistema do RoqueOS acompanha, os apps sobem por último. O raio de alcance está no grafo do `roqueos-kit`: `roqueos-graph blast app-sdk`.

## 4. Passar os consumidores para uma tag nova

Cada consumidor pina uma tag no `package.json` dele (`github:roqueos-apps/app-sdk#vX.Y.Z`). Passar é mudar essa linha, um `yarn install`, o gate do consumidor verde e o changelog dele dizendo o que mudou ([`.claude/loop.md`](../../.claude/loop.md)). Que tag cada clone local pinava em 18/11/2026 está em [INTEGRACOES.md](INTEGRACOES.md#5-quem-pina-que-versão).

## 5. Desfazer

| Passo irreversível                      | Como desfazer                                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tag empurrada no commit errado          | antes de alguém pinar: `git push origin :refs/tags/vX.Y.Z`, `git tag -d vX.Y.Z`, tag no commit da `main` e push de novo. Depois que um consumidor pinou, não mexa: corte uma versão de correção |
| release que quebra um consumidor        | o consumidor volta para a tag anterior no `package.json` dele; aqui, um `git revert` na `main` e uma tag nova                                                                                   |
| merge por squash de um PR de release    | o commit da tag não está na `main`: refaça a tag no commit do squash, antes de alguém pinar                                                                                                     |
| commit sem sign-off já empurrado num PR | `git rebase --signoff main` e `git push --force-with-lease` no branch do PR (nunca na `main`)                                                                                                   |

## 6. Backup e restauração

O SDK não tem estado: nem banco, nem arquivo gerado, nem segredo. Tudo está no git do GitHub (`roqueos-apps/app-sdk`), e os consumidores levam o SHA exato no lockfile. Restaurar é clonar:

```bash
git clone https://github.com/roqueos-apps/app-sdk.git && cd app-sdk && yarn install --frozen-lockfile --ignore-scripts && yarn verificar
```

## 7. O que acompanhar

| Sinal          | Saudável                                                         | Como ver                                |
| -------------- | ---------------------------------------------------------------- | --------------------------------------- |
| o gate         | `yarn verificar` sai 0; 133 testes passam (medido em 18/11/2026) | `yarn verificar`                        |
| o CI           | `verificar` verde na `main` e nos PRs abertos                    | `gh run list --limit 3`                 |
| a última tag   | o workflow `tag` verde para ela                                  | `gh run list --workflow tag --limit 1`  |
| quem contribui | nenhuma issue ou PR de fora sem resposta                         | `gh issue list`, `gh pr list`           |
| as docs        | o `roqueos-docs` termina em `roqueos-docs: ok`                   | `node <roqueos-kit>/tools/roqueos-docs` |
