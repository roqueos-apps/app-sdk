# Estender

_[English](../EXTENDING.md) | Português_

> **Para quem:** quem precisa que o SDK ofereça uma coisa que ele ainda não oferece, ou confira uma coisa que ele ainda não confere.
> **O que tem aqui:** como acrescentar uma capacidade opcional, uma função a uma opcional que existe, uma regra do `app check`, uma variável CSS, uma pasta, um código de erro e um campo do manifesto, com os arquivos que cada passo toca e a conferência que o garante.
> **Onde ir para o resto:** as regras de versão estão em [OPERACAO.md](OPERACAO.md#3-mudar-o-contrato-sem-quebrar); o critério de teste, em [TESTES.md](TESTES.md).

Toda extensão começa com uma issue ([CONTRIBUTING.md](CONTRIBUTING.md)) e termina com o `yarn verificar` verde, um teste que reprova sem a mudança e uma entrada no `CHANGELOG.md`.

## Sumário

1. [Uma capacidade opcional nova](#1-uma-capacidade-opcional-nova)
2. [Uma função numa opcional que existe](#2-uma-função-numa-opcional-que-existe)
3. [Uma regra nova do app check](#3-uma-regra-nova-do-app-check)
4. [Uma variável CSS, uma pasta, um código de erro](#4-uma-variável-css-uma-pasta-um-código-de-erro)
5. [Um campo do manifesto](#5-um-campo-do-manifesto)
6. [O que não se estende aqui](#6-o-que-não-se-estende-aqui)

## 1. Uma capacidade opcional nova

Capacidade nasce opcional, com motivo escrito, na onda do primeiro app que precisa dela ([CLAUDE.md](../../CLAUDE.md)). A `anexos` e a `janela` da 0.3.0 são os exemplos mais recentes para copiar.

| Passo | Arquivo                                                                                                                                                             | O que fazer                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [`src/contrato.js`](../../src/contrato.js)                                                                                                                          | a entrada em `CAPACIDADES` com `obrigatoria: false`, a `forma` e o `porque`. O `OPCIONAIS` sai dela, então o manifesto e a regra das opcionais declaradas do `app check` a pegam sem outra mudança |
| 2     | `src/<capacidade>.js`                                                                                                                                               | a semântica que todo sistema divide (conferências, ids, limites), com as garantias escritas no topo, como em [`src/anexos.js`](../../src/anexos.js)                                                |
| 3     | [`src/erros.js`](../../src/erros.js)                                                                                                                                | o código novo com que a capacidade rejeita, se houver                                                                                                                                              |
| 4     | [`src/index.js`](../../src/index.js)                                                                                                                                | exportar as peças comuns                                                                                                                                                                           |
| 5     | [`src/host/falso.js`](../../src/host/falso.js), [`src/host/desenvolvimento.js`](../../src/host/desenvolvimento.js), e um host em memória em `src/host/` se precisar | implementar com a mesma semântica do RoqueOS, e no falso as alavancas que um teste precisa                                                                                                         |
| 6     | `test/`                                                                                                                                                             | os testes: a forma no contrato, a semântica no falso, o sistema de desenvolvimento, e um sistema sem ela recusando o app que a exige                                                               |
| 7     | [`test/contrato.test.js`](../../test/contrato.test.js)                                                                                                              | a lista das capacidades está travada lá, de propósito                                                                                                                                              |
| 8     | [README.pt-BR.md](../../README.pt-BR.md), [REFERENCIA.md](REFERENCIA.md), `CHANGELOG.md`                                                                            | a capacidade nas tabelas, e a versão menor                                                                                                                                                         |

Depois o `roqueos-front` implementa no sistema do RoqueOS, e o app que precisou sobe o pin por último.

## 2. Uma função numa opcional que existe

Acrescente a chave na `forma` da capacidade em [`src/contrato.js`](../../src/contrato.js) e implemente nos três sistemas. É versão menor: o app de antes continua servido, e o sistema sem a função recusa, com o motivo, o app que exige a capacidade. O teste "o sistema da 0.2.0, só com salvar, não serve a app que exige arquivos" em [`test/arquivos-e-janela.test.js`](../../test/arquivos-e-janela.test.js) é o modelo. Tirar uma função, ou mudar a forma ou o sentido dela, é versão nova do contrato ([OPERACAO.md](OPERACAO.md#3-mudar-o-contrato-sem-quebrar)).

## 3. Uma regra nova do app check

| Passo | Arquivo                                                                                                     | O que fazer                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [`src/verificacao.js`](../../src/verificacao.js)                                                            | um `conferirX(raiz)` exportado que devolve a lista de problemas, cada um com arquivo e linha quando houver; o comentário diz o motivo, e de que incidente veio |
| 2     | `verificarRepo` no mesmo arquivo                                                                            | um `{ secao, problemas }` novo; o nome da seção é o que o CLI imprime                                                                                          |
| 3     | [`test/verificacao.test.js`](../../test/verificacao.test.js)                                                | um teste em "cada regra reprova o que diz" que reprova sem a regra, e o fixture continuando a passar inteiro                                                   |
| 4     | [REFERENCIA.md](REFERENCIA.md#6-as-seções-do-app-check), [QUANDO-QUEBRA.md](QUANDO-QUEBRA.md#3-o-app-check) | a seção e a mensagem literal dela                                                                                                                              |

Leia o código com `semComentarios` antes, para linha comentada não contar. Sem aviso: a regra reprova ou não existe ([`bin/app.mjs`](../../bin/app.mjs)). Antes de dizer pronto, mate o mutante: quebre a regra de propósito e veja o teste falhar ([CLAUDE.md](../../CLAUDE.md)).

## 4. Uma variável CSS, uma pasta, um código de erro

| Peça           | Onde                                                                   | O que mais se mexe                                                                                                                         |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| variável CSS   | `VARIAVEIS_DO_SISTEMA` em [`src/variaveis.js`](../../src/variaveis.js) | ela precisa existir no tema do RoqueOS: um teste no `roqueos-front` reprova quando falta uma da lista. Acrescentar é menor, tirar é quebra |
| pasta          | `PASTAS_DE_ARQUIVOS` em [`src/arquivos.js`](../../src/arquivos.js)     | um identificador sem acento (o rótulo que a pessoa vê é do sistema); o sistema do RoqueOS mapeia; `pastas` no manifesto aceita sozinho     |
| código de erro | `CODIGOS_DE_ERRO` em [`src/erros.js`](../../src/erros.js)              | a descrição no fonte, e a tabela em [REFERENCIA.md](REFERENCIA.md#3-códigos-de-erro)                                                       |

## 5. Um campo do manifesto

Acrescente em `CAMPOS` em [`src/manifesto.js`](../../src/manifesto.js), com a validação no `validarManifesto`, e um teste em [`test/manifesto.test.js`](../../test/manifesto.test.js). Sem a entrada em `CAMPOS`, todo `app.json` que usa o campo reprova, e é essa a ideia: campo desconhecido nunca é ignorado. O `roqueos-front` lê os manifestos no build ([INTEGRACOES.md](INTEGRACOES.md)), então campo que muda o comportamento do RoqueOS precisa da mudança lá também.

## 6. O que não se estende aqui

- **Um idioma.** Os dez estão travados pelo [`test/idiomas.test.js`](../../test/idiomas.test.js), e a mesma lista mora no `jogo-sdk`; idioma novo é mudança no RoqueOS inteiro ([`src/idiomas.js`](../../src/idiomas.js)).
- **Uma capacidade obrigatória.** As seis vêm do `jogo-sdk`; capacidade nova nasce opcional.
- **Uma dependência de runtime ou um script de instalação.** Não pode ([CLAUDE.md](../../CLAUDE.md)).
